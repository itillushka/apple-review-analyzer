"""LangGraph orchestration for insights generation.

A small but real state graph with a feedback cycle:

    START ─▶ classify ─▶ synthesize ─▶ critic ─▶ END
                              ▲             │
                              └──(ungrounded & retries left)──┘

- The runtime critic is **deterministic**: it checks each synthesized theme is actually
  grounded in the negative reviews, drops hallucinated ones, and may loop back to
  re-synthesize once. (Premium-model validation lives in dev-time distillation, phase 3b.)
"""

from __future__ import annotations

import re
from typing import TypedDict

from langgraph.graph import END, StateGraph

from ..models import Insights, Review, ReviewSentiment, ThemeStat
from .derived import assemble_insights
from .llm import _analyze_negatives, _classify_sentiment, _text, llm_available

_MAX_RETRIES = 1


class _State(TypedDict, total=False):
    reviews: list[Review]
    per_review: list[ReviewSentiment]
    themes: list[ThemeStat]
    actionable: list[str]
    taxonomy: dict[str, int]
    retries: int
    dropped: int
    result: Insights


def _negatives(state: _State) -> list[Review]:
    return [
        r
        for r, s in zip(state["reviews"], state["per_review"])
        if s.sentiment == "negative"
    ]


def _ground_themes(
    themes: list[ThemeStat], negatives: list[Review]
) -> tuple[list[ThemeStat], list[ThemeStat]]:
    """Split themes into (grounded, dropped) by whether their words appear in reviews."""
    corpus = " ".join(_text(r).lower() for r in negatives)
    grounded, dropped = [], []
    for t in themes:
        words = re.findall(r"[a-z]{4,}", t.theme.lower())
        if not words or any(w[:5] in corpus for w in words):
            grounded.append(t)
        else:
            dropped.append(t)
    return grounded, dropped


# --- graph nodes ---

def _classify_node(state: _State) -> dict:
    return {"per_review": _classify_sentiment(state["reviews"])}


def _synthesize_node(state: _State) -> dict:
    themes, actionable, taxonomy = _analyze_negatives(_negatives(state))
    return {"themes": themes, "actionable": actionable, "taxonomy": taxonomy}


def _critic_node(state: _State) -> dict:
    grounded, dropped = _ground_themes(state["themes"], _negatives(state))
    result = assemble_insights(
        backend="llm",
        reviews=state["reviews"],
        per_review=state["per_review"],
        themes=grounded,
        actionable=state.get("actionable", []),
        taxonomy=state.get("taxonomy", {}),
    )
    return {
        "themes": grounded,
        "dropped": len(dropped),
        "retries": state.get("retries", 0) + 1,
        "result": result,
    }


def _critic_decision(state: _State) -> str:
    """Re-synthesize once if the critic dropped ungrounded themes."""
    if state.get("dropped", 0) > 0 and state.get("retries", 0) <= _MAX_RETRIES:
        return "retry"
    return "done"


def _build():
    g = StateGraph(_State)
    g.add_node("classify", _classify_node)
    g.add_node("synthesize", _synthesize_node)
    g.add_node("critic", _critic_node)
    g.set_entry_point("classify")
    g.add_edge("classify", "synthesize")
    g.add_edge("synthesize", "critic")
    g.add_conditional_edges("critic", _critic_decision, {"retry": "synthesize", "done": END})
    return g.compile()


_GRAPH = _build()


def run_insights(reviews: list[Review]) -> Insights:
    """Run the insights graph (classify → synthesize → critic, with re-synthesize loop).

    Raises:
        RuntimeError: if no OpenRouter key is configured (LLM is required).
    """
    if not llm_available():
        raise RuntimeError("OPENROUTER_API_KEY is required to generate insights.")
    final = _GRAPH.invoke({"reviews": reviews, "retries": 0})
    return final["result"]
