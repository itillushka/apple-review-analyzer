"""Tests for the Apple RSS review collector (httpx mocked with respx)."""

from __future__ import annotations

import re

import httpx
import pytest
import respx

from app.collector import (
    InvalidAppIdError,
    NoReviewsError,
    collect_reviews,
)

URL_RE = re.compile(
    r"/(?P<country>\w{2})/rss/customerreviews/page=(?P<page>\d+)/id=(?P<app_id>\d+)/sortby=(?P<sort>\w+)/json"
)


def _app_info_entry() -> dict:
    """The first feed entry describes the app (no im:rating) and must be skipped."""
    return {"id": {"label": "app-info"}, "im:name": {"label": "Some App"}}


def _review_entry(i: int, rating: int = 5) -> dict:
    return {
        "id": {"label": f"r-{i}"},
        "title": {"label": f"Title {i}"},
        "content": {"label": f"Body of review {i}"},
        "im:rating": {"label": str(rating)},
        "author": {"name": {"label": f"user{i}"}},
        "im:version": {"label": "8.2.1"},
        "updated": {"label": "2026-05-12T08:30:00-07:00"},
        "im:voteCount": {"label": "3"},
        "im:voteSum": {"label": "2"},
    }


def _feed(ids: list[int]) -> dict:
    entries = [_app_info_entry()] + [_review_entry(i) for i in ids]
    return {"feed": {"entry": entries}}


def _empty_feed() -> dict:
    # A page past the end / a storefront with no reviews: no "entry" key.
    return {"feed": {"author": {"name": {"label": "iTunes Store"}}}}


def _route(page_map):
    """Return a respx side_effect that serves ``page_map[(country, sort, page)]``.

    Values are lists of review ids; a missing key yields an empty feed (end of pages).
    """

    def responder(request: httpx.Request) -> httpx.Response:
        m = URL_RE.search(str(request.url))
        assert m, f"unexpected URL: {request.url}"
        key = (m["country"], m["sort"], int(m["page"]))
        ids = page_map.get(key)
        if not ids:
            return httpx.Response(200, json=_empty_feed())
        return httpx.Response(200, json=_feed(ids))

    return responder


@respx.mock
async def test_collect_basic_sample_and_fields():
    # europe → gb is the first storefront; serve 50 reviews there, rest empty.
    page_map = {("gb", "mostrecent", 1): list(range(1, 51))}
    respx.get(url__regex=r"https://itunes\.apple\.com/.*").mock(side_effect=_route(page_map))

    result = await collect_reviews("1459969523", limit=10, seed=42, use_cache=False)

    assert result.meta.region == "europe"
    assert result.meta.returned == 10
    assert result.meta.available == 50  # app-info entry excluded
    assert result.meta.countries == ["gb"]
    assert result.meta.warning is None
    assert len({r.id for r in result.reviews}) == 10  # unique
    sample = result.reviews[0]
    assert 1 <= sample.rating <= 5
    assert sample.version == "8.2.1"
    assert sample.country == "gb"


@respx.mock
async def test_collect_deduplicates_across_pages():
    # page 1 is short of the limit → page 2 is fetched; overlapping ids must collapse.
    page_map = {
        ("gb", "mostrecent", 1): list(range(1, 31)),   # ids 1..30
        ("gb", "mostrecent", 2): list(range(20, 50)),  # ids 20..49 (overlap 20..30)
    }
    respx.get(url__regex=r"https://itunes\.apple\.com/.*").mock(side_effect=_route(page_map))

    result = await collect_reviews("1459969523", limit=40, seed=1, use_cache=False)

    assert result.meta.available == 49  # union of 1..49, duplicates collapsed
    assert result.meta.returned == 40


@respx.mock
async def test_fewer_than_requested_sets_warning():
    page_map = {("gb", "mostrecent", 1): [1, 2, 3, 4, 5]}
    respx.get(url__regex=r"https://itunes\.apple\.com/.*").mock(side_effect=_route(page_map))

    result = await collect_reviews("1459969523", limit=100, seed=7, use_cache=False)

    assert result.meta.available == 5
    assert result.meta.returned == 5
    assert result.meta.warning is not None and "5" in result.meta.warning


@respx.mock
async def test_region_selection_falls_through_storefronts():
    # asia order starts with "in" (empty here) → should fall through to "jp".
    page_map = {("jp", "mostrecent", 1): list(range(1, 51))}
    respx.get(url__regex=r"https://itunes\.apple\.com/.*").mock(side_effect=_route(page_map))

    result = await collect_reviews(
        "1459969523", region="asia", limit=10, seed=3, use_cache=False
    )

    assert result.meta.region == "asia"
    assert result.meta.countries == ["jp"]
    assert result.reviews[0].country == "jp"


@respx.mock
async def test_no_reviews_raises():
    respx.get(url__regex=r"https://itunes\.apple\.com/.*").mock(side_effect=_route({}))

    with pytest.raises(NoReviewsError):
        await collect_reviews("404040404", limit=100, use_cache=False)


async def test_invalid_app_id_raises():
    with pytest.raises(InvalidAppIdError):
        await collect_reviews("not-a-number")


async def test_invalid_region_raises():
    with pytest.raises(ValueError):
        await collect_reviews("1459969523", region="mars")


@respx.mock
async def test_incremental_topup_fetches_only_the_deficit(monkeypatch, tmp_path):
    """Second call needing more reviews must NOT re-fetch already-seen pages."""
    from app.config import settings

    monkeypatch.setattr(settings, "data_dir", str(tmp_path))  # isolated cache

    calls: list[tuple[str, str, int]] = []
    page_map = {
        ("gb", "mostrecent", 1): list(range(1, 6)),    # 5 reviews
        ("gb", "mostrecent", 2): list(range(6, 11)),   # 5 more
    }

    def responder(request: httpx.Request) -> httpx.Response:
        m = URL_RE.search(str(request.url))
        key = (m["country"], m["sort"], int(m["page"]))
        calls.append(key)
        ids = page_map.get(key)
        return httpx.Response(200, json=_feed(ids) if ids else _empty_feed())

    respx.get(url__regex=r"https://itunes\.apple\.com/.*").mock(side_effect=responder)

    first = await collect_reviews("777", region="europe", limit=5, seed=1)
    assert first.meta.available == 5
    page1_calls = calls.count(("gb", "mostrecent", 1))

    # Now ask for more: only the deficit (page 2) should be fetched.
    second = await collect_reviews("777", region="europe", limit=10, seed=1)
    assert second.meta.available == 10
    assert calls.count(("gb", "mostrecent", 1)) == page1_calls  # page 1 not re-fetched
    assert ("gb", "mostrecent", 2) in calls  # deficit was fetched
