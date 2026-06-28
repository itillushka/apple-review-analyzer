"""Rating metrics — pure statistics computed from reviews (no NLP/LLM).

Covers the basics required by the task (average, star distribution) plus the
product-useful extras: top/bottom-box, rating by app version (release analytics),
a monthly trend, per-storefront counts, and the review date range.
"""

from __future__ import annotations

from collections import Counter, defaultdict

from .models import MonthStat, RatingMetrics, Review, ReviewSentiment, VersionStat


def _mean(values: list[int]) -> float:
    return round(sum(values) / len(values), 2) if values else 0.0


def _version_key(version: str) -> tuple[int, ...]:
    """Sort key that orders dotted versions numerically (6.9.0 < 6.36.0)."""
    return tuple(int(p) if p.isdigit() else 0 for p in version.split("."))


def compute_mismatch(
    reviews: list[Review], sentiments: list[ReviewSentiment]
) -> tuple[int, list[str]]:
    """Count reviews whose star rating disagrees with their text sentiment.

    A mismatch is a high rating (4–5★) with negative text, or a low rating (1–2★)
    with positive text — useful for catching sarcasm, mis-taps, or off-topic praise.
    Returns ``(count, example_ids)``.
    """
    by_id = {s.id: s.sentiment for s in sentiments}
    examples: list[str] = []
    for r in reviews:
        sentiment = by_id.get(r.id)
        if sentiment is None:
            continue
        if (r.rating >= 4 and sentiment == "negative") or (
            r.rating <= 2 and sentiment == "positive"
        ):
            examples.append(r.id)
    return len(examples), examples


def compute_rating_metrics(reviews: list[Review]) -> RatingMetrics:
    """Compute rating statistics for a set of reviews.

    Raises:
        ValueError: if ``reviews`` is empty (nothing to summarize).
    """
    total = len(reviews)
    if total == 0:
        raise ValueError("Cannot compute metrics for an empty review set.")

    ratings = [r.rating for r in reviews]
    average = _mean(ratings)

    distribution = {star: 0 for star in range(1, 6)}
    for rating in ratings:
        distribution[rating] += 1
    distribution_pct = {
        star: round(count / total * 100, 1) for star, count in distribution.items()
    }
    top_box_pct = round((distribution[4] + distribution[5]) / total * 100, 1)
    bottom_box_pct = round((distribution[1] + distribution[2]) / total * 100, 1)

    # Release analytics: average rating per app version.
    by_version_raw: dict[str, list[int]] = defaultdict(list)
    for r in reviews:
        if r.version:
            by_version_raw[r.version].append(r.rating)
    by_version = [
        VersionStat(version=v, count=len(rs), average=_mean(rs))
        for v, rs in by_version_raw.items()
    ]
    by_version.sort(key=lambda s: _version_key(s.version), reverse=True)

    # Trend: average rating per calendar month, ascending.
    by_month_raw: dict[str, list[int]] = defaultdict(list)
    for r in reviews:
        if r.updated:
            by_month_raw[r.updated.strftime("%Y-%m")].append(r.rating)
    trend = [
        MonthStat(month=m, count=len(rs), average=_mean(rs))
        for m, rs in sorted(by_month_raw.items())
    ]

    by_country = dict(Counter(r.country for r in reviews))

    dates = [r.updated for r in reviews if r.updated]
    earliest = min(dates) if dates else None
    latest = max(dates) if dates else None

    return RatingMetrics(
        total=total,
        average=average,
        distribution=distribution,
        distribution_pct=distribution_pct,
        top_box_pct=top_box_pct,
        bottom_box_pct=bottom_box_pct,
        by_version=by_version,
        trend=trend,
        by_country=by_country,
        earliest=earliest,
        latest=latest,
    )
