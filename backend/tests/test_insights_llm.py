"""Real integration tests for the LLM insights backend (live OpenRouter calls).

These hit the configured OpenRouter models, so they require ``OPENROUTER_API_KEY``
in the environment / ``.env``. They are skipped (not failed) when no key is present
so the suite still runs in a keyless checkout.
"""

from __future__ import annotations

import pytest

from app.insights import compute_llm_insights, llm_available
from app.models import Review

pytestmark = pytest.mark.skipif(not llm_available(), reason="no OPENROUTER_API_KEY")


def _r(id: str, text: str, rating: int) -> Review:
    return Review(
        id=id, title="t", content=text, content_clean=text, rating=rating, country="gb"
    )


def test_llm_insights_end_to_end():
    reviews = [
        _r("a", "I absolutely love this app, it is wonderful and so helpful.", 5),
        _r("b", "Fantastic experience, the readings are accurate and fun.", 5),
        _r("c", "They charged my card without consent and won't refund. Terrible.", 1),
        _r("d", "The subscription is a scam, billing is confusing and I lost money.", 1),
    ]

    ins = compute_llm_insights(reviews)

    assert ins.backend == "llm"
    assert len(ins.per_review) == 4
    # The two clearly-positive and two clearly-negative reviews should land right.
    assert ins.sentiment_distribution["positive"] >= 1
    assert ins.sentiment_distribution["negative"] >= 1
    # Negatives present → we expect themes and actionable recommendations.
    assert ins.actionable
    assert ins.negative_themes
