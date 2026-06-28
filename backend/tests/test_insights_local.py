"""Tests for the local (offline) insights backend."""

from __future__ import annotations

from app.insights import compute_local_insights
from app.models import Review


def _r(id: str, text: str, rating: int = 3) -> Review:
    return Review(
        id=id, title="t", content=text, content_clean=text, rating=rating, country="gb"
    )


def test_local_insights_sentiment_themes_and_advice():
    reviews = [
        _r("a", "I love this app, it is wonderful and amazing", 5),
        _r("b", "Great experience, fantastic and really helpful", 5),
        _r("c", "Terrible billing, they charged me without consent, awful", 1),
        _r("d", "Awful subscription billing, it is a scam and horrible", 1),
    ]

    ins = compute_local_insights(reviews)

    assert ins.backend == "local"
    assert ins.sentiment_distribution["positive"] >= 2
    assert ins.sentiment_distribution["negative"] >= 2
    assert ins.actionable  # non-empty recommendations
    themes_text = " ".join(t.theme.lower() for t in ins.negative_themes)
    assert any(word in themes_text for word in ("billing", "subscription", "scam"))


def test_local_insights_all_positive_has_no_negative_themes():
    reviews = [_r("a", "love it, amazing and wonderful", 5), _r("b", "great, fantastic", 5)]

    ins = compute_local_insights(reviews)

    assert ins.sentiment_distribution["negative"] == 0
    assert ins.negative_themes == []
    assert ins.actionable  # still returns a (fallback) message
