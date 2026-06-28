"""FastAPI application — Apple Store review analysis API.

Endpoints (interactive docs at ``/docs``):

- ``GET  /health``                 — liveness probe
- ``POST /collect``                — collect reviews for an app, return metadata
- ``GET  /metrics``                — rating metrics (no LLM)
- ``GET  /insights``               — sentiment, themes, taxonomy, recommendations
- ``GET  /analyze``                — full analysis (metrics + insights), cached
- ``GET  /reviews/download``       — raw review data as JSON or CSV
"""

from __future__ import annotations

import csv
import io
from typing import Awaitable, TypeVar

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from . import service
from .collector import InvalidAppIdError, NoReviewsError
from .config import settings
from .models import AnalysisResult, CollectionMeta, CollectRequest, Insights, Review

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Collect Apple App Store reviews and analyze them with NLP/LLM.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_T = TypeVar("_T")

# Shared query parameters.
_AppId = Query(..., description="Numeric App Store id, e.g. 1459969523 (Nebula)")
_Region = Query("europe", pattern="^(europe|asia|africa)$")
_Limit = Query(100, ge=1, le=500)


async def _guard(coro: Awaitable[_T]) -> _T:
    """Run a service coroutine, mapping domain errors to HTTP status codes."""
    try:
        return await coro
    except InvalidAppIdError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except ValueError as exc:  # unknown region, etc.
        raise HTTPException(status_code=400, detail=str(exc))
    except NoReviewsError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


# --- system ---

@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    """Liveness probe for Docker / uptime checks and the deploy reverse proxy."""
    return {"status": "ok", "service": settings.app_name, "version": settings.app_version}


@app.get("/", tags=["system"])
def root() -> dict[str, str]:
    return {"service": settings.app_name, "docs": "/docs", "health": "/health"}


# --- collection ---

@app.post("/collect", tags=["reviews"], response_model=CollectionMeta)
async def collect(payload: CollectRequest) -> CollectionMeta:
    """Collect reviews for an app and return collection metadata (count, sources)."""
    result = await _guard(
        service.collect_only(payload.app_id, region=payload.region, limit=payload.limit)
    )
    return result.meta


@app.get("/reviews/download", tags=["reviews"])
async def download_reviews(
    app_id: str = _AppId,
    region: str = _Region,
    limit: int = _Limit,
    format: str = Query("json", pattern="^(json|csv)$"),
) -> Response:
    """Download the raw collected reviews as JSON or CSV."""
    result = await _guard(service.collect_only(app_id, region=region, limit=limit))
    reviews = result.reviews
    filename = f"{app_id}_{region}_reviews.{format}"
    if format == "csv":
        body = _reviews_to_csv(reviews)
        return Response(
            content=body,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    return JSONResponse(
        content=[r.model_dump(mode="json") for r in reviews],
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# --- analysis ---

@app.get("/metrics", tags=["analysis"])
async def metrics(app_id: str = _AppId, region: str = _Region, limit: int = _Limit) -> dict:
    """Rating metrics only — average, distribution, by-version, trend (no LLM)."""
    collected, rating_metrics = await _guard(
        service.metrics_only(app_id, region=region, limit=limit)
    )
    return {"collected": collected, "metrics": rating_metrics}


@app.get("/insights", tags=["analysis"], response_model=Insights)
async def insights(
    app_id: str = _AppId,
    region: str = _Region,
    limit: int = _Limit,
    refresh: bool = False,
) -> Insights:
    """Sentiment, negative themes, emotion/taxonomy, and actionable recommendations."""
    analysis = await _guard(
        service.analyze(app_id, region=region, limit=limit, refresh=refresh)
    )
    return analysis.insights


@app.get("/analyze", tags=["analysis"], response_model=AnalysisResult)
async def analyze(
    app_id: str = _AppId,
    region: str = _Region,
    limit: int = _Limit,
    refresh: bool = False,
) -> AnalysisResult:
    """Full analysis: collection metadata + rating metrics + insights (cached)."""
    return await _guard(
        service.analyze(app_id, region=region, limit=limit, refresh=refresh)
    )


def _reviews_to_csv(reviews: list[Review]) -> str:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        ["id", "rating", "title", "content", "content_en", "country",
         "version", "updated", "vote_count", "vote_sum"]
    )
    for r in reviews:
        writer.writerow(
            [r.id, r.rating, r.title, r.content, r.content_en or "", r.country,
             r.version or "", r.updated.isoformat() if r.updated else "",
             r.vote_count, r.vote_sum]
        )
    return buf.getvalue()
