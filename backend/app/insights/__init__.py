"""Insights generation — sentiment, negative themes, and actionable recommendations.

`compute_insights` is the dispatcher: it uses the LLM backend (OpenRouter, multi-model)
when a key is configured, and falls back to the offline `local` backend (VADER + YAKE)
otherwise or on failure. Both backends emit the same ``Insights`` shape.
"""

from .llm import compute_insights, compute_llm_insights, llm_available
from .local import compute_local_insights

__all__ = [
    "compute_insights",
    "compute_llm_insights",
    "compute_local_insights",
    "llm_available",
]
