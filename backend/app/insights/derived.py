"""Shared assembly of the Insights object.

Centralizes the sentiment / emotion / mismatch aggregation so the LLM backend and the
graph emit the same ``Insights`` shape.
"""

from __future__ import annotations

from collections import Counter

from ..metrics import compute_mismatch
from ..models import Insights, Review, ReviewSentiment, ThemeStat

_SENTIMENTS = ("positive", "neutral", "negative")


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
