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
    # us/mostrecent page 1 → 50 reviews; everything else empty.
    page_map = {("us", "mostrecent", 1): list(range(1, 51))}
    respx.get(url__regex=r"https://itunes\.apple\.com/.*").mock(side_effect=_route(page_map))

    result = await collect_reviews("1459969523", limit=10, seed=42)

    assert result.meta.returned == 10
    assert result.meta.available == 50  # app-info entry excluded
    assert result.meta.warning is None
    assert len(result.reviews) == 10
    assert len({r.id for r in result.reviews}) == 10  # unique
    sample = result.reviews[0]
    assert 1 <= sample.rating <= 5
    assert sample.version == "8.2.1"
    assert sample.country == "us"


@respx.mock
async def test_collect_deduplicates_across_pages():
    # Force a second page by requesting more than one page worth; page 2 repeats page 1.
    page_map = {
        ("us", "mostrecent", 1): list(range(1, 51)),
        ("us", "mostrecent", 2): list(range(1, 51)),  # exact duplicates
    }
    respx.get(url__regex=r"https://itunes\.apple\.com/.*").mock(side_effect=_route(page_map))

    result = await collect_reviews("1459969523", limit=40, seed=1)

    # Duplicates collapse: still only 50 unique reviews available, not 100.
    assert result.meta.available == 50
    assert result.meta.returned == 40


@respx.mock
async def test_fewer_than_requested_sets_warning():
    page_map = {("us", "mostrecent", 1): [1, 2, 3, 4, 5]}
    respx.get(url__regex=r"https://itunes\.apple\.com/.*").mock(side_effect=_route(page_map))

    result = await collect_reviews("1459969523", limit=100, seed=7)

    assert result.meta.available == 5
    assert result.meta.returned == 5
    assert result.meta.warning is not None and "5" in result.meta.warning


@respx.mock
async def test_no_reviews_raises():
    respx.get(url__regex=r"https://itunes\.apple\.com/.*").mock(side_effect=_route({}))

    with pytest.raises(NoReviewsError):
        await collect_reviews("404040404", limit=100)


async def test_invalid_app_id_raises():
    with pytest.raises(InvalidAppIdError):
        await collect_reviews("not-a-number")
