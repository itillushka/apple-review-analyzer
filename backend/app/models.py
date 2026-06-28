"""Shared Pydantic models.

Starts with the review/collection shapes needed by the collector; API response
models are layered on in phase 5. Keeping them here gives every layer a single
source of truth for the data contract.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class Review(BaseModel):
    """A single App Store customer review, normalized from Apple's RSS feed."""

    id: str
    title: str = ""
    content: str = ""
    rating: int = Field(ge=1, le=5)
    author: str | None = None
    version: str | None = None  # app version the review was left on (im:version)
    updated: datetime | None = None  # when the review was posted/updated
    vote_count: int = 0  # how many users voted on helpfulness (im:voteCount)
    vote_sum: int = 0  # net helpful votes (im:voteSum)
    country: str  # App Store storefront the review came from (e.g. "de")

    # Filled by the translation layer (None until translated). For English
    # storefronts these mirror the originals.
    language: str | None = None  # detected/assumed source language (ISO 639-1)
    title_en: str | None = None
    content_en: str | None = None

    # Filled by the processing layer: cleaned/normalized English text for analysis.
    title_clean: str | None = None
    content_clean: str | None = None


class CollectionMeta(BaseModel):
    """Bookkeeping about a collection run — surfaced to the API for transparency."""

    app_id: str
    region: str  # europe | asia | africa
    requested: int
    available: int  # unique reviews gathered into the sampling pool
    returned: int
    countries: list[str]  # storefronts that actually supplied reviews
    sort_orders: list[str]
    warning: str | None = None  # set when fewer than `requested` reviews exist


class CollectResult(BaseModel):
    """Result of a collection run: the sampled reviews plus metadata."""

    meta: CollectionMeta
    reviews: list[Review]


class VersionStat(BaseModel):
    """Average rating for a single app version."""

    version: str
    count: int
    average: float


class MonthStat(BaseModel):
    """Average rating for a single calendar month (``YYYY-MM``)."""

    month: str
    count: int
    average: float


class RatingMetrics(BaseModel):
    """Pure rating statistics computed from a set of reviews (no NLP/LLM)."""

    total: int
    average: float
    distribution: dict[int, int]  # star (1..5) -> count
    distribution_pct: dict[int, float]  # star (1..5) -> percentage
    top_box_pct: float  # share of 4–5 star reviews
    bottom_box_pct: float  # share of 1–2 star reviews
    by_version: list[VersionStat]  # release analytics
    trend: list[MonthStat]  # monthly trend, ascending
    by_country: dict[str, int]  # storefront -> count
    earliest: datetime | None = None
    latest: datetime | None = None


class CollectionState(BaseModel):
    """Persisted accumulation enabling incremental (top-up) collection.

    Holds every unique review gathered so far for an (app_id, region), plus the
    pagination cursors and the set of fully-read storefront/sort keys, so a later
    request only fetches the missing reviews instead of re-fetching everything.
    """

    app_id: str
    region: str
    reviews: list[Review] = Field(default_factory=list)
    # "country|sort" -> next page number to read (only set once data was seen).
    cursors: dict[str, int] = Field(default_factory=dict)
    # "country|sort" keys that returned data and then ended — skip on top-up.
    exhausted: list[str] = Field(default_factory=list)
