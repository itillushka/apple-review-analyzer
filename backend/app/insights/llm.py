"""LLM insights backend — sentiment classification + theme/recommendation synthesis.

Calls cheap, top-ranked OpenRouter models (routed per task in ``config``) with robust
JSON parsing, retries, and graceful fallback to the local backend on any failure.
LLM calls are traced via Langfuse when its keys are configured.
"""

from __future__ import annotations

import json
import logging
import os
import re
from collections import Counter
from functools import lru_cache

from ..config import settings
from ..models import Insights, Review, ReviewSentiment, ThemeStat
from .local import compute_local_insights

logger = logging.getLogger(__name__)

_JSON_BLOCK = re.compile(r"\{.*\}", re.DOTALL)
_CLASSIFY_BATCH = 25  # reviews per classification call
_MAX_NEGATIVES = 40  # negative reviews sent to the analyzer
_SCORE = {"positive": 1.0, "neutral": 0.0, "negative": -1.0}


def llm_available() -> bool:
    """True when an OpenRouter key is configured."""
    return bool(settings.openrouter_api_key)


@lru_cache(maxsize=1)
def _client():
    """OpenAI-compatible client → OpenRouter; Langfuse-wrapped when configured."""
    base_url, api_key = settings.openrouter_base_url, settings.openrouter_api_key
    if settings.langfuse_public_key and settings.langfuse_secret_key:
        os.environ.setdefault("LANGFUSE_PUBLIC_KEY", settings.langfuse_public_key)
        os.environ.setdefault("LANGFUSE_SECRET_KEY", settings.langfuse_secret_key)
        if settings.langfuse_host:
            os.environ.setdefault("LANGFUSE_HOST", settings.langfuse_host)
        try:
            from langfuse.openai import OpenAI  # drop-in, auto-traces

            return OpenAI(base_url=base_url, api_key=api_key)
        except Exception as exc:  # pragma: no cover - tracing is optional
            logger.warning("Langfuse OpenAI wrapper unavailable (%s); tracing off.", exc)
    from openai import OpenAI

    return OpenAI(base_url=base_url, api_key=api_key)


def _parse_json(text: str) -> dict | None:
    """Best-effort JSON extraction tolerant of markdown fences and stray prose."""
    text = (text or "").strip()
    if text.startswith("```"):
        text = text.strip("`")
    try:
        return json.loads(text)
    except Exception:
        match = _JSON_BLOCK.search(text)
        if match:
            try:
                return json.loads(match.group(0))
            except Exception:
                return None
    return None


def _chat_json(model: str, system: str, user: str, *, retries: int = 2) -> dict:
    """Call a model and return parsed JSON, retrying on errors / non-JSON output."""
    client = _client()
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]
    last = ""
    for attempt in range(retries + 1):
        try:
            resp = client.chat.completions.create(
                model=model, messages=messages, temperature=0.1
            )
        except Exception as exc:  # transient provider/rate-limit errors → retry
            last = str(exc)
            logger.warning("LLM call error on %s (attempt %d): %s", model, attempt, last[:120])
            continue
        text = resp.choices[0].message.content or ""
        data = _parse_json(text)
        if data is not None:
            return data
        last = text
        messages += [
            {"role": "assistant", "content": text},
            {"role": "user", "content": "That was not valid JSON. Reply with ONLY the JSON object."},
        ]
    raise ValueError(f"{model} returned no valid JSON after {retries + 1} tries: {last[:160]!r}")


def _text(review: Review, limit: int = 500) -> str:
    return (review.content_clean or review.content_en or review.content or "")[:limit]


def _classify_sentiment(reviews: list[Review]) -> list[ReviewSentiment]:
    """Classify each review's sentiment in batches via the classify model."""
    labels: dict[str, str] = {}
    system = "You are a precise sentiment classifier for app reviews. Output strict JSON only."
    for start in range(0, len(reviews), _CLASSIFY_BATCH):
        batch = reviews[start : start + _CLASSIFY_BATCH]
        items = [{"id": r.id, "text": _text(r)} for r in batch]
        user = (
            "Classify each review's sentiment as exactly one of: positive, neutral, negative.\n"
            f"Reviews (JSON):\n{json.dumps(items, ensure_ascii=False)}\n\n"
            'Return JSON: {"results":[{"id":"<id>","sentiment":"positive|neutral|negative"}]}'
        )
        try:
            data = _chat_json(settings.model_classify, system, user)
        except Exception as exc:
            logger.warning("classify batch failed (%s); leaving batch neutral.", exc)
            continue
        for row in data.get("results", []):
            sentiment = str(row.get("sentiment", "")).lower().strip()
            if sentiment in _SCORE:
                labels[str(row.get("id"))] = sentiment

    return [
        ReviewSentiment(
            id=r.id,
            sentiment=labels.get(r.id, "neutral"),
            score=_SCORE[labels.get(r.id, "neutral")],
        )
        for r in reviews
    ]


def _analyze_negatives(negatives: list[Review]) -> tuple[list[ThemeStat], list[str]]:
    """Extract negative themes + actionable recommendations via the synthesize model."""
    if not negatives:
        return [], ["No negative reviews to analyze; sentiment is broadly positive."]

    sample = negatives[:_MAX_NEGATIVES]
    items = [{"id": r.id, "text": _text(r, 400)} for r in sample]
    system = (
        "You are a product analyst extracting actionable insight from negative app "
        "reviews. Output strict JSON only."
    )
    user = (
        f"Here are {len(sample)} negative reviews (JSON):\n{json.dumps(items, ensure_ascii=False)}\n\n"
        "Identify the top recurring themes (max 6) and concrete, actionable improvements "
        "(max 5). For each theme, report how many of these reviews mention it.\n"
        'Return JSON: {"themes":[{"theme":"<short label>","count":<int>,"example":"<short quote>"}],'
        '"actionable":["<recommendation>"]}'
    )
    data = _chat_json(settings.model_synthesize, system, user)

    n = len(sample)
    themes: list[ThemeStat] = []
    for t in data.get("themes", [])[:8]:
        label = str(t.get("theme", "")).strip()[:60]
        if not label:
            continue
        try:
            count = max(0, min(int(t.get("count", 0)), n))
        except (TypeError, ValueError):
            count = 0
        example = str(t.get("example", "")).strip()[:140]
        themes.append(
            ThemeStat(
                theme=label,
                count=count,
                share=round(count / n * 100, 1) if n else 0.0,
                examples=[example] if example else [],
            )
        )
    actionable = [str(a).strip() for a in data.get("actionable", []) if str(a).strip()][:6]
    return themes, actionable


def compute_llm_insights(reviews: list[Review]) -> Insights:
    """Full LLM insights: classify sentiment, then mine themes + recommendations."""
    per_review = _classify_sentiment(reviews)
    counts = Counter(s.sentiment for s in per_review)
    distribution = {k: counts.get(k, 0) for k in ("positive", "neutral", "negative")}
    total = len(per_review) or 1
    distribution_pct = {k: round(v / total * 100, 1) for k, v in distribution.items()}

    negatives = [r for r, s in zip(reviews, per_review) if s.sentiment == "negative"]
    themes, actionable = _analyze_negatives(negatives)

    return Insights(
        backend="llm",
        sentiment_distribution=distribution,
        sentiment_pct=distribution_pct,
        negative_themes=themes,
        actionable=actionable,
        per_review=per_review,
    )


def compute_insights(reviews: list[Review]) -> Insights:
    """Dispatcher: LLM backend when available, else (or on failure) the local backend."""
    if not llm_available():
        return compute_local_insights(reviews)
    try:
        return compute_llm_insights(reviews)
    except Exception as exc:
        logger.warning("LLM insights failed (%s); falling back to local backend.", exc)
        return compute_local_insights(reviews)
