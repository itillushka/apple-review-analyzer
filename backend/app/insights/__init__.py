"""Insights generation — sentiment, negative themes, and actionable recommendations.

`local` is the offline backend (VADER + YAKE + rules); the LangGraph-orchestrated
LLM backend is layered on top in later steps, sharing the same ``Insights`` shape.
"""

from .local import compute_local_insights

__all__ = ["compute_local_insights"]
