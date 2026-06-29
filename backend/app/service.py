"""Analysis service — orchestrates the full pipeline behind the API.

    collect → translate → preprocess → rating metrics + insights graph

The heavy, synchronous work (translation, NLP/LLM) runs in a worker thread so it
does not block the async event loop. Full analyses are cached per (app_id, region);
pass ``refresh=True`` to recompute.
"""

from __future__ import annotations

import asyncio

from . import storage
from .collector import collect_reviews
from .insights import run_insights
from .metrics import compute_rating_metrics
from .models import AnalysisResult, CollectionMeta, CollectResult, RatingMetrics, Review
from .processing import preprocess_reviews
from .translation import translate_reviews


def _analyze_reviews(reviews: list[Review]) -> tuple[RatingMetrics, "object"]:
    """Synchronous heavy lifting: translate, clean, compute metrics + insights."""
    translate_reviews(reviews)
    preprocess_reviews(reviews)
    metrics = compute_rating_metrics(reviews)
    insights = run_insights(reviews)
    return metrics, insights


async def analyze(
    app_id: str, *, region: str = "europe", limit: int = 100, refresh: bool = False
) -> AnalysisResult:
    """Run (or return cached) the full analysis for an app."""
    if not refresh:
        cached = storage.load_analysis(app_id, region)
        if cached is not None:
            return cached

    collected = await collect_reviews(app_id, region=region, limit=limit)
    metrics, insights = await asyncio.to_thread(_analyze_reviews, collected.reviews)

    analysis = AnalysisResult(
        app_id=collected.meta.app_id,
        region=region,
        collected=collected.meta,
        metrics=metrics,
        insights=insights,
    )
    storage.save_analysis(analysis)
    # Cache the exact sampled reviews joined with their sentiment (for /reviews).
    storage.save_reviews(collected.meta.app_id, region, _enrich_reviews(collected.reviews, insights))
    return analysis


def _enrich_reviews(reviews: list[Review], insights) -> list[dict]:
    """Join each review's text with its classified sentiment (for the explorer)."""
    sentiment = {p.id: p.sentiment for p in insights.per_review}
    return [
        {
            "id": r.id,
            "rating": r.rating,
            "title": r.title_en or r.title,
            "content": r.content_en or r.content,
            "version": r.version,
            "date": r.updated.date().isoformat() if r.updated else None,
            "country": r.country,
            "vote_count": r.vote_count,
            "sentiment": sentiment.get(r.id, "neutral"),
        }
        for r in reviews
    ]


async def reviews_list(
    app_id: str, *, region: str = "europe", limit: int = 100
) -> list[dict]:
    """Enriched reviews (review + sentiment); runs analysis once if not cached."""
    cached = storage.load_reviews(app_id, region)
    if cached is not None:
        return cached
    # No reviews cache yet (e.g. analysis was cached before reviews were stored):
    # recompute so the exact sampled reviews + sentiment are persisted.
    await analyze(app_id, region=region, limit=limit, refresh=True)
    return storage.load_reviews(app_id, region) or []


async def metrics_only(
    app_id: str, *, region: str = "europe", limit: int = 100
) -> tuple[CollectionMeta, RatingMetrics]:
    """Collect reviews and compute rating metrics only (no translation / no LLM)."""
    collected = await collect_reviews(app_id, region=region, limit=limit)
    metrics = await asyncio.to_thread(compute_rating_metrics, collected.reviews)
    return collected.meta, metrics


async def collect_only(
    app_id: str, *, region: str = "europe", limit: int = 100
) -> CollectResult:
    """Collect reviews and return them with metadata (for /collect and /download)."""
    return await collect_reviews(app_id, region=region, limit=limit)
