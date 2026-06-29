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
import logging
import random

import httpx

from . import storage
from .models import CollectionMeta, CollectionState, CollectResult, Review

logger = logging.getLogger(__name__)

# Public iTunes Lookup API — resolves an app's display name + icon from its id.
LOOKUP_URL = "https://itunes.apple.com/lookup"

# 50 reviews/page, pages 1..10 per storefront.
RSS_URL = (
    "https://itunes.apple.com/{country}/rss/customerreviews"
    "/page={page}/id={app_id}/sortby={sort}/json"
)
SORT_ORDERS = ("mostrecent", "mosthelpful")

# Reviews are collected by region. Apple's RSS is intermittently empty for a given
# (app, storefront, sort), so within a region we iterate several storefronts until
# the pool is filled. Reviews come in each storefront's language; a translation
# layer normalizes them to English downstream (so the NLP stack behaves). Lists are
# ordered roughly by review volume, English storefronts first where available.
REGION_STOREFRONTS: dict[str, tuple[str, ...]] = {
    "europe": ("gb", "ie", "de", "fr", "it", "es", "nl", "se", "no", "dk",
               "fi", "pl", "pt", "at", "be", "ch", "cz", "gr", "hu", "ro"),
    "asia": ("in", "jp", "kr", "hk", "tw", "sg", "id", "th", "vn", "ph",
             "my", "ae", "sa", "il", "tr"),
    "africa": ("za", "ng", "eg", "ke", "ma", "gh", "tz", "ug", "dz", "tn"),
}
DEFAULT_REGION = "europe"
MAX_PAGES = 10
REQUEST_TIMEOUT = 15.0


async def fetch_app_meta(app_id: str, country: str = "us") -> dict:
    """Best-effort app display name + icon via the iTunes Lookup API.

    Tries the given storefront first, then falls back to ``us``/``gb`` (some apps
    aren't listed in a given country, and the endpoint is occasionally flaky), so a
    transient miss doesn't permanently leave an app nameless. Returns
    ``{"name": ..., "icon": ...}`` or ``{}`` — never raises.
    """
    tried: list[str] = []
    countries = [c for c in (country, "us", "gb") if c and not (c in tried or tried.append(c))]
    try:
        async with httpx.AsyncClient(headers={"User-Agent": "review-atlas/0.1"}) as client:
            for cc in countries:
                try:
                    resp = await client.get(
                        LOOKUP_URL, params={"id": app_id, "country": cc}, timeout=REQUEST_TIMEOUT
                    )
                    resp.raise_for_status()
                    results = resp.json().get("results", [])
                except Exception as exc:  # try the next storefront
                    logger.warning("app meta lookup failed for %s/%s (%s)", app_id, cc, exc)
                    continue
                if results:
                    r0 = results[0]
                    return {
                        "name": r0.get("trackName"),
                        "icon": r0.get("artworkUrl100") or r0.get("artworkUrl60"),
                    }
    except Exception as exc:  # client construction / unexpected — degrade gracefully
        logger.warning("app meta lookup failed for %s (%s)", app_id, exc)
    return {}


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
    region: str = DEFAULT_REGION,
    limit: int = 100,
    seed: int | None = None,
    max_pages: int = MAX_PAGES,
    use_cache: bool = True,
) -> CollectResult:
    """Collect ~``limit`` reviews for ``app_id`` from a region and return a sample.

    Collection is **incremental**. Previously fetched reviews and pagination cursors
    are cached per (app_id, region); on a follow-up that needs more, only the deficit
    is fetched — each storefront resumes from its cursor and transiently-empty
    storefronts are re-probed — instead of re-downloading everything. Fetching stops
    as soon as the pool reaches ``limit`` (extras already on a page are kept for
    sampling variety). Reviews are de-duplicated by id and sampled with a seedable RNG.

    Args:
        region: one of ``europe`` (default), ``asia``, ``africa``.
        use_cache: persist/reuse collection state for top-up. Disable for stateless
            one-shot collection (e.g. tests).

    Raises:
        InvalidAppIdError: if ``app_id`` is not numeric.
        ValueError: if ``region`` is unknown.
        NoReviewsError: if no reviews can be found at all.
    """
    app_id = _validate_app_id(app_id)
    if region not in REGION_STOREFRONTS:
        raise ValueError(
            f"Unknown region {region!r}; choose one of {tuple(REGION_STOREFRONTS)}."
        )

    state = (storage.load_state(app_id, region) if use_cache else None) or CollectionState(
        app_id=app_id, region=region
    )
    pool: dict[str, Review] = {r.id: r for r in state.reviews}
    cursors: dict[str, int] = dict(state.cursors)  # "country|sort" -> next page
    exhausted: set[str] = set(state.exhausted)

    # Only hit the network if the cache can't already satisfy the request.
    if len(pool) < limit:
        await _fill_pool(app_id, region, pool, cursors, exhausted, limit, max_pages)
        if use_cache:
            storage.save_state(
                CollectionState(
                    app_id=app_id,
                    region=region,
                    reviews=list(pool.values()),
                    cursors=cursors,
                    exhausted=sorted(exhausted),
                )
            )

    if not pool:
        raise NoReviewsError(
            f"No reviews found for app id {app_id}. It may be invalid or have no reviews."
        )

    items = list(pool.values())
    contributed = sorted({r.country for r in items})
    rng = random.Random(seed)
    returned = min(limit, len(items))
    sampled = rng.sample(items, k=returned)

    warning = None
    if len(items) < limit:
        warning = f"Only {len(items)} reviews available (requested {limit})."

    meta = CollectionMeta(
        app_id=app_id,
        region=region,
        requested=limit,
        available=len(items),
        returned=returned,
        countries=contributed,
        sort_orders=list(SORT_ORDERS),
        warning=warning,
    )
    return CollectResult(meta=meta, reviews=sampled)


async def _fill_pool(
    app_id: str,
    region: str,
    pool: dict[str, Review],
    cursors: dict[str, int],
    exhausted: set[str],
    limit: int,
    max_pages: int,
) -> None:
    """Top up ``pool`` toward ``limit`` in place, resuming from cursors.

    Fetches only the deficit: each (storefront, sort) resumes from its cursor;
    a storefront that produced data and then ended is marked exhausted and skipped
    next time; a storefront that is empty right now keeps no cursor, so it is
    re-probed on a later call (Apple's feeds are intermittently empty).
    """
    async with httpx.AsyncClient(headers={"User-Agent": "review-atlas/0.1"}) as client:
        for country in REGION_STOREFRONTS[region]:
            for sort in SORT_ORDERS:
                key = f"{country}|{sort}"
                if key in exhausted:
                    continue
                start = cursors.get(key, 1)
                for page in range(start, max_pages + 1):
                    reviews = await _fetch_page(client, app_id, country, page, sort)
                    if not reviews:
                        # Real end only if this storefront had produced data before.
                        if key in cursors:
                            exhausted.add(key)
                        break  # transient empty (no cursor) → re-probe next time
                    cursors[key] = page + 1
                    for review in reviews:
                        pool[review.id] = review
                    if len(pool) >= limit:
                        return
