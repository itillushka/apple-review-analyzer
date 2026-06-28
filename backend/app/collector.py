"""Collect App Store reviews from Apple's public customer-reviews RSS feed.

Apple exposes customer reviews at a public, key-less endpoint:

    https://itunes.apple.com/{country}/rss/customerreviews/page={n}/id={app_id}/sortby={sort}/json

It returns up to 50 reviews per page, up to 10 pages per storefront. There is no
"random" sort, so to approximate a random sample we build a pool across multiple
sort orders (and, if needed, fallback storefronts), de-duplicate by review id, and
sample from that pool with a seedable RNG.
"""

from __future__ import annotations

import asyncio
import random

import httpx

from .models import CollectionMeta, CollectResult, Review

# 50 reviews/page, pages 1..10 per storefront.
RSS_URL = (
    "https://itunes.apple.com/{country}/rss/customerreviews"
    "/page={page}/id={app_id}/sortby={sort}/json"
)
SORT_ORDERS = ("mostrecent", "mosthelpful")
# English-language storefronts. Apple's RSS is intermittently empty for a given
# (app, storefront, sort), so we fall back across English markets to stay robust
# while keeping the review text in English (so the NLP stack behaves).
DEFAULT_FALLBACK_COUNTRIES = ("gb", "ca", "au", "ie", "nz", "in", "za", "sg")
MAX_PAGES = 10
REQUEST_TIMEOUT = 15.0


class CollectorError(Exception):
    """Base class for collection failures."""


class InvalidAppIdError(CollectorError):
    """Raised when the app id is not a positive integer string."""


class NoReviewsError(CollectorError):
    """Raised when no reviews can be found (invalid id or app has no reviews)."""


def _validate_app_id(app_id: str) -> str:
    """Return the normalized app id or raise ``InvalidAppIdError``.

    App Store ids are numeric (e.g. ``1459969523``). We accept a leading ``id``-free
    numeric string only — anything else is rejected early with a clear message.
    """
    cleaned = str(app_id).strip()
    if not cleaned.isdigit():
        raise InvalidAppIdError(
            f"Invalid app id {app_id!r}: expected a numeric App Store id (e.g. 1459969523)."
        )
    return cleaned


def _parse_entry(entry: dict, country: str) -> Review | None:
    """Convert one raw RSS entry into a ``Review``.

    The first feed entry describes the app itself (no ``im:rating``) and is skipped.
    Malformed entries are skipped rather than crashing the whole batch.
    """
    if "im:rating" not in entry:
        return None
    try:
        return Review(
            id=entry["id"]["label"],
            title=entry.get("title", {}).get("label", "") or "",
            content=entry.get("content", {}).get("label", "") or "",
            rating=int(entry["im:rating"]["label"]),
            author=entry.get("author", {}).get("name", {}).get("label"),
            version=entry.get("im:version", {}).get("label"),
            updated=entry.get("updated", {}).get("label"),
            vote_count=int(entry.get("im:voteCount", {}).get("label", 0) or 0),
            vote_sum=int(entry.get("im:voteSum", {}).get("label", 0) or 0),
            country=country,
        )
    except (KeyError, TypeError, ValueError):
        # Skip a single malformed review; never let it sink the collection.
        return None


async def _fetch_page(
    client: httpx.AsyncClient,
    app_id: str,
    country: str,
    page: int,
    sort: str,
    *,
    retries: int = 3,
    backoff: float = 0.5,
) -> list[Review]:
    """Fetch and parse one page; returns ``[]`` for missing pages or transient gaps.

    Network errors are retried with exponential backoff; a persistent failure raises
    ``CollectorError``. Non-200 responses (e.g. 404 for an unknown id) yield ``[]``.
    """
    url = RSS_URL.format(country=country, page=page, app_id=app_id, sort=sort)
    last_exc: Exception | None = None
    for attempt in range(retries):
        try:
            resp = await client.get(url, timeout=REQUEST_TIMEOUT)
            if resp.status_code != 200:
                return []
            feed = resp.json().get("feed", {})
            entries = feed.get("entry", [])
            if isinstance(entries, dict):  # single-entry feeds arrive as a dict
                entries = [entries]
            return [r for e in entries if (r := _parse_entry(e, country)) is not None]
        except httpx.RequestError as exc:  # connect/read/timeout
            last_exc = exc
            await asyncio.sleep(backoff * (2**attempt))
        except (ValueError, KeyError) as exc:  # bad JSON / unexpected shape
            last_exc = exc
            return []
    raise CollectorError(f"Failed to fetch reviews from {url}") from last_exc


async def collect_reviews(
    app_id: str,
    *,
    country: str = "us",
    limit: int = 100,
    seed: int | None = None,
    fallback_countries: tuple[str, ...] = DEFAULT_FALLBACK_COUNTRIES,
    max_pages: int = MAX_PAGES,
) -> CollectResult:
    """Collect ~``limit`` reviews for ``app_id`` and return a sampled result.

    Strategy: gather a pool across ``SORT_ORDERS`` for the primary ``country`` (then
    fallback storefronts if still short), de-duplicate by review id, and sample
    ``limit`` reviews with a seedable RNG. If fewer than ``limit`` exist, all are
    returned and a warning is attached to the metadata.

    Raises:
        InvalidAppIdError: if ``app_id`` is not numeric.
        NoReviewsError: if no reviews can be found at all.
    """
    app_id = _validate_app_id(app_id)
    pool: dict[str, Review] = {}
    contributed: list[str] = []  # storefronts that actually returned reviews
    target_pool = limit * 2  # over-sample so the random pick is meaningfully random

    countries = [country, *(c for c in fallback_countries if c != country)]
    async with httpx.AsyncClient(headers={"User-Agent": "review-atlas/0.1"}) as client:
        for ctry in countries:
            country_added = False
            for sort in SORT_ORDERS:
                for page in range(1, max_pages + 1):
                    reviews = await _fetch_page(client, app_id, ctry, page, sort)
                    if not reviews:
                        break  # no more pages for this sort/storefront
                    for review in reviews:
                        pool[review.id] = review
                    country_added = True
                    if len(pool) >= target_pool:
                        break
                if len(pool) >= target_pool:
                    break
            if country_added:
                contributed.append(ctry)
            # Only reach for further storefronts if we're still short.
            if len(pool) >= limit:
                break

    if not pool:
        raise NoReviewsError(
            f"No reviews found for app id {app_id}. It may be invalid or have no reviews."
        )

    items = list(pool.values())
    rng = random.Random(seed)
    returned = min(limit, len(items))
    sampled = rng.sample(items, k=returned)

    warning = None
    if len(items) < limit:
        warning = f"Only {len(items)} reviews available (requested {limit})."

    meta = CollectionMeta(
        app_id=app_id,
        requested=limit,
        available=len(items),
        returned=returned,
        countries=contributed,
        sort_orders=list(SORT_ORDERS),
        warning=warning,
    )
    return CollectResult(meta=meta, reviews=sampled)
