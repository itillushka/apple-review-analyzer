"""Shared assembly of the Insights object + local emotion/taxonomy helpers.

Centralizes the sentiment / emotion / mismatch aggregation so the local backend,
the LLM backend, and the graph all emit the same ``Insights`` shape.
"""

from __future__ import annotations

from collections import Counter

from ..metrics import compute_mismatch
from ..models import Insights, Review, ReviewSentiment, ThemeStat

_SENTIMENTS = ("positive", "neutral", "negative")
_TAXONOMY_KEYS = ("bug", "feature_request", "ux", "pricing", "other")

# Coarse emotion mapping for the local (no-LLM) backend.
_LOCAL_EMOTION = {
    "positive": "satisfaction",
    "neutral": "neutral",
    "negative": "frustration",
}

_TAXONOMY_KEYWORDS = {
    "bug": ("crash", "bug", "error", "freeze", "glitch", "broken", "not work", "doesn't work"),
    "pricing": ("price", "expensive", "subscription", "charge", "money", "refund",
                "cost", "scam", "trial", "pay"),
    "feature_request": ("wish", "should add", "would be nice", "please add", "missing"),
    "ux": ("confus", "hard to", "difficult", "interface", "navigat", "clunky", "slow"),
}


def local_emotion(sentiment: str) -> str:
    """Map a sentiment label to a coarse emotion (used by the local backend)."""
    return _LOCAL_EMOTION.get(sentiment, "neutral")


def local_taxonomy(negatives: list[Review]) -> dict[str, int]:
    """Bucket negative reviews into bug/feature/ux/pricing/other by keyword match."""
    counts = {k: 0 for k in _TAXONOMY_KEYS}
    for r in negatives:
        text = (r.content_clean or r.content_en or r.content or "").lower()
        matched = False
        for category, keywords in _TAXONOMY_KEYWORDS.items():
            if any(kw in text for kw in keywords):
                counts[category] += 1
                matched = True
        if not matched:
            counts["other"] += 1
    return counts


def assemble_insights(
    *,
    backend: str,
    reviews: list[Review],
    per_review: list[ReviewSentiment],
    themes: list[ThemeStat],
    actionable: list[str],
    taxonomy: dict[str, int] | None = None,
) -> Insights:
    """Build the full Insights from per-review sentiment + themes + taxonomy."""
    counts = Counter(s.sentiment for s in per_review)
    distribution = {k: counts.get(k, 0) for k in _SENTIMENTS}
    total = len(per_review) or 1
    distribution_pct = {k: round(v / total * 100, 1) for k, v in distribution.items()}
    emotion_distribution = dict(Counter(s.emotion for s in per_review if s.emotion))
    mismatch_count, mismatch_examples = compute_mismatch(reviews, per_review)
    return Insights(
        backend=backend,
        sentiment_distribution=distribution,
        sentiment_pct=distribution_pct,
        negative_themes=themes,
        actionable=actionable,
        per_review=per_review,
        emotion_distribution=emotion_distribution,
        taxonomy=taxonomy or {},
        mismatch_count=mismatch_count,
        mismatch_examples=mismatch_examples[:20],
    )
