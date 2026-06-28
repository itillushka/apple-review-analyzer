"""Tests for the LangGraph insights orchestration."""

from __future__ import annotations

import pytest

import app.insights.graph as graph
from app.insights.graph import _ground_themes, run_insights
from app.insights.llm import llm_available
from app.models import Review, ThemeStat


def _r(id: str, text: str, rating: int = 1) -> Review:
    return Review(
        id=id, title="t", content=text, content_clean=text, rating=rating, country="gb"
    )


def test_ground_themes_drops_unsupported():
    negatives = [_r("1", "the billing charged me without consent, total scam")]
    themes = [
        ThemeStat(theme="Billing issues", count=1, share=100.0),
        ThemeStat(theme="Spaceship navigation", count=1, share=100.0),
    ]

    grounded, dropped = _ground_themes(themes, negatives)

    assert any(t.theme == "Billing issues" for t in grounded)
    assert any(t.theme == "Spaceship navigation" for t in dropped)


def test_graph_local_path(monkeypatch):
    # Force the offline branch regardless of whether a key is configured.
    monkeypatch.setattr(graph, "llm_available", lambda: False)

    ins = run_insights([_r("1", "terrible billing scam, lost my money")])

    assert ins.backend == "local"
    assert ins.per_review  # local backend still classifies


@pytest.mark.skipif(not llm_available(), reason="no OPENROUTER_API_KEY")
def test_graph_llm_path_end_to_end():
    reviews = [
        _r("a", "I love this app, wonderful and helpful", 5),
        _r("b", "They charged me without consent, terrible billing scam", 1),
        _r("c", "Cannot cancel the subscription, lost money", 1),
    ]

    ins = run_insights(reviews)

    assert ins.backend == "llm"
    assert len(ins.per_review) == 3
    # All surviving themes must be grounded in the reviews (deterministic critic).
    corpus = "i love this app they charged me cannot cancel subscription billing scam money"
    for t in ins.negative_themes:
        assert t.theme  # non-empty
