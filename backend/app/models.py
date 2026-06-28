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
    country: str  # App Store storefront the review came from (e.g. "us")


class CollectionMeta(BaseModel):
    """Bookkeeping about a collection run — surfaced to the API for transparency."""

    app_id: str
    requested: int
    available: int  # unique reviews gathered into the sampling pool
    returned: int
    countries: list[str]
    sort_orders: list[str]
    warning: str | None = None  # set when fewer than `requested` reviews exist


class CollectResult(BaseModel):
    """Result of a collection run: the sampled reviews plus metadata."""

    meta: CollectionMeta
    reviews: list[Review]
