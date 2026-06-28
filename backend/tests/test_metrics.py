"""Tests for rating metrics."""

from __future__ import annotations

from datetime import datetime

import pytest

from app.metrics import compute_mismatch, compute_rating_metrics
from app.models import Review, ReviewSentiment


def _r(rating, *, version=None, updated=None, country="gb", id="x"):
    return Review(
        id=id, title="t", content="c", rating=rating,
        country=country, version=version, updated=updated,
    )


def test_rating_metrics_full():
    reviews = [
        _r(5, version="1.0", updated=datetime(2026, 1, 15), country="gb", id="a"),
        _r(5, version="1.0", updated=datetime(2026, 1, 20), country="gb", id="b"),
        _r(4, version="1.1", updated=datetime(2026, 2, 5), country="de", id="c"),
        _r(1, version="1.1", updated=datetime(2026, 2, 10), country="de", id="d"),
    ]

    m = compute_rating_metrics(reviews)

    assert m.total == 4
    assert m.average == 3.75
    assert m.distribution == {1: 1, 2: 0, 3: 0, 4: 1, 5: 2}
    assert m.distribution_pct[5] == 50.0
    assert m.top_box_pct == 75.0  # 4★ + 5★
    assert m.bottom_box_pct == 25.0  # 1★ + 2★

    # Release analytics, versions ordered numerically descending.
    assert [v.version for v in m.by_version] == ["1.1", "1.0"]
    by_ver = {v.version: v for v in m.by_version}
    assert by_ver["1.0"].count == 2 and by_ver["1.0"].average == 5.0
    assert by_ver["1.1"].average == 2.5

    # Monthly trend, ascending.
    assert [t.month for t in m.trend] == ["2026-01", "2026-02"]
    assert m.trend[0].average == 5.0

    assert m.by_country == {"gb": 2, "de": 2}
    assert m.earliest == datetime(2026, 1, 15)
    assert m.latest == datetime(2026, 2, 10)


def test_metrics_handles_missing_version_and_date():
    # No version / date on any review → empty by_version and trend, but core stats hold.
    reviews = [_r(3, id="a"), _r(3, id="b")]
    m = compute_rating_metrics(reviews)
    assert m.average == 3.0
    assert m.by_version == []
    assert m.trend == []
    assert m.earliest is None and m.latest is None


def test_empty_reviews_raises():
    with pytest.raises(ValueError):
        compute_rating_metrics([])


def test_compute_mismatch():
    reviews = [_r(5, id="a"), _r(1, id="b"), _r(5, id="c")]
    sentiments = [
        ReviewSentiment(id="a", sentiment="negative", score=-1.0),  # 5★ + negative → mismatch
        ReviewSentiment(id="b", sentiment="positive", score=1.0),  # 1★ + positive → mismatch
        ReviewSentiment(id="c", sentiment="positive", score=1.0),  # 5★ + positive → ok
    ]

    count, examples = compute_mismatch(reviews, sentiments)

    assert count == 2
    assert set(examples) == {"a", "b"}
