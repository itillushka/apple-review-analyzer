"""Insights generation — sentiment, emotions, themes, and actionable recommendations.

Powered by OpenRouter multi-model routing and orchestrated as a LangGraph state graph
(classify → synthesize → deterministic critic, with a re-synthesize loop). ``run_insights``
is the entry point used by the API.
"""

from .graph import run_insights
from .llm import compute_llm_insights, llm_available

__all__ = ["run_insights", "compute_llm_insights", "llm_available"]
