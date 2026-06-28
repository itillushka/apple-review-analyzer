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
from functools import lru_cache
from pathlib import Path

from ..config import settings
from ..models import Insights, Review, ReviewSentiment, ThemeStat
from .derived import assemble_insights

logger = logging.getLogger(__name__)

_JSON_BLOCK = re.compile(r"\{.*\}", re.DOTALL)
_CLASSIFY_BATCH = 25  # reviews per classification call
_MAX_NEGATIVES = 40  # negative reviews sent to the analyzer
_SCORE = {"positive": 1.0, "neutral": 0.0, "negative": -1.0}
_EMOTIONS = (
    "joy", "satisfaction", "anger", "frustration", "disappointment", "confusion", "neutral",
)
_TAXONOMY_KEYS = ("bug", "feature_request", "ux", "pricing", "other")


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


# Path to distilled few-shot examples produced by scripts/distill_prompts.py.
_FEWSHOT_PATH = Path(__file__).parent / "prompts" / "classify_fewshot.json"


@lru_cache(maxsize=1)
def _classify_fewshot() -> str:
    """Few-shot block distilled from the teacher model (empty if not yet distilled)."""
    if not _FEWSHOT_PATH.exists():
        return ""
    try:
        examples = json.loads(_FEWSHOT_PATH.read_text(encoding="utf-8"))
    except Exception:
        return ""
    lines = [f'- "{e["text"][:120]}" -> {e["sentiment"]}' for e in examples if e.get("text")]
    if not lines:
        return ""
    return "Labeled examples (text -> sentiment):\n" + "\n".join(lines) + "\n\n"


def _classify_sentiment(reviews: list[Review]) -> list[ReviewSentiment]:
    """Classify each review's sentiment + emotion in batches via the classify model."""
    results: dict[str, tuple[str, str | None]] = {}
    system = "You are a precise classifier for app reviews. Output strict JSON only."
    for start in range(0, len(reviews), _CLASSIFY_BATCH):
        batch = reviews[start : start + _CLASSIFY_BATCH]
        items = [{"id": r.id, "text": _text(r)} for r in batch]
        user = (
            _classify_fewshot()  # distilled examples (empty until distillation runs)
            + "For each review, classify the sentiment (positive, neutral, or negative) and the "
            "dominant emotion (one of: joy, satisfaction, anger, frustration, disappointment, "
            "confusion, neutral).\n"
            f"Reviews (JSON):\n{json.dumps(items, ensure_ascii=False)}\n\n"
            'Return JSON: {"results":[{"id":"<id>","sentiment":"...","emotion":"..."}]}'
        )
        try:
            data = _chat_json(settings.model_classify, system, user)
        except Exception as exc:
            logger.warning("classify batch failed (%s); leaving batch neutral.", exc)
            continue
        for row in data.get("results", []):
            sentiment = str(row.get("sentiment", "")).lower().strip()
            emotion = str(row.get("emotion", "")).lower().strip()
            if sentiment in _SCORE:
                results[str(row.get("id"))] = (
                    sentiment,
                    emotion if emotion in _EMOTIONS else None,
                )

    out: list[ReviewSentiment] = []
    for r in reviews:
        sentiment, emotion = results.get(r.id, ("neutral", None))
        out.append(
            ReviewSentiment(id=r.id, sentiment=sentiment, score=_SCORE[sentiment], emotion=emotion)
        )
    return out


def _analyze_negatives(
    negatives: list[Review],
) -> tuple[list[ThemeStat], list[str], dict[str, int]]:
    """Extract negative themes + recommendations + a bug/feature/ux/pricing taxonomy."""
    if not negatives:
        return [], ["No negative reviews to analyze; sentiment is broadly positive."], {}

    sample = negatives[:_MAX_NEGATIVES]
    items = [{"id": r.id, "text": _text(r, 400)} for r in sample]
    system = (
        "You are a product analyst extracting actionable insight from negative app "
        "reviews. Output strict JSON only."
    )
    user = (
        f"Here are {len(sample)} negative reviews (JSON):\n{json.dumps(items, ensure_ascii=False)}\n\n"
        "Provide: (1) the top recurring themes (max 6), each with how many of these reviews "
        "mention it and a short example quote; (2) concrete actionable improvements (max 5); "
        "(3) a taxonomy counting how many reviews fall into each of: bug, feature_request, "
        "ux, pricing, other.\n"
        'Return JSON: {"themes":[{"theme":"<short label>","count":<int>,"example":"<short quote>"}],'
        '"actionable":["<recommendation>"],'
        '"taxonomy":{"bug":<int>,"feature_request":<int>,"ux":<int>,"pricing":<int>,"other":<int>}}'
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

    tax_raw = data.get("taxonomy", {}) or {}
    taxonomy: dict[str, int] = {}
    for key in _TAXONOMY_KEYS:
        try:
            taxonomy[key] = max(0, int(tax_raw.get(key, 0)))
        except (TypeError, ValueError):
            taxonomy[key] = 0

    return themes, actionable, taxonomy


def compute_llm_insights(reviews: list[Review]) -> Insights:
    """Full LLM insights: classify sentiment+emotion, then mine themes/recommendations/taxonomy."""
    per_review = _classify_sentiment(reviews)
    negatives = [r for r, s in zip(reviews, per_review) if s.sentiment == "negative"]
    themes, actionable, taxonomy = _analyze_negatives(negatives)
    return assemble_insights(
        backend="llm",
        reviews=reviews,
        per_review=per_review,
        themes=themes,
        actionable=actionable,
        taxonomy=taxonomy,
    )
