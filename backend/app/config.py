"""Application configuration via environment variables.

Settings are read from the process environment and an optional ``.env`` file.
Only the values needed by the current build phase are actively used; the
LLM / Langfuse keys are declared here as optional placeholders so later phases
can rely on them without changing the import surface (keeps the prefix stable).
"""

from __future__ import annotations

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed application settings, hydrated from env / ``.env``.

    Unknown environment variables are ignored so the same process env can be
    shared with other tools without raising validation errors.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- Server ---
    app_name: str = "Apple Store Review Analysis API"
    app_version: str = "0.1.0"
    port: int = 8100
    # Directory for the JSON cache of collection state (incremental top-up).
    data_dir: str = "data"
    # Access token gating the data endpoints (abuse / credit-drain protection).
    # When unset, the API is open (local dev); when set, callers must send it.
    access_token: str | None = None
    # Origins allowed to call the API from a browser (Vite dev + same-host).
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:8100",
    ]

    # --- LLM: OpenRouter ---
    openrouter_api_key: str | None = None
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    # Multi-model routing across top-ranked, cheap OpenRouter models from distinct vendors
    # (per OpenRouter usage rankings, 2026). Verify ids/prices at openrouter.ai/models.
    # The runtime critic is deterministic (grounding check) — no premium model per request;
    # the premium OpenAI model below is used only at dev-time (prompt distillation, phase 3b).
    # classify: a fast, cheap, non-reasoning instruct model — sentiment labelling needs
    # no chain-of-thought. Benchmarked at 100% accuracy on a multilingual gold set in
    # ~1.5s; a reasoning model (tencent/hy3-preview) matched the accuracy but took ~19x
    # longer and burned ~2000 reasoning tokens per call (the cause of multi-minute hangs).
    model_classify: str = "qwen/qwen3-30b-a3b-instruct-2507"  # fast, cheap, non-reasoning
    # synthesize: a fast model with clean structured output for theme/insight extraction.
    # Benchmarked at ~1.7s on a 40-review prompt; deepseek-v4-flash matched the quality but
    # ran away to ~6500 completion tokens (~39s) — the second cause of multi-minute hangs.
    # Distinct vendor from classify (Google vs Alibaba) keeps the routing genuinely multi-model.
    model_synthesize: str = "google/gemini-2.5-flash-lite"  # fast, clean JSON (themes/insights)
    model_teacher: str = "gpt-5.5"  # OpenAI, dev-time distillation/eval only

    # Per-request LLM timeout (seconds). Bounds any single model call so a slow/hung
    # provider can never stall the analysis pipeline; we run our own retry loop on top.
    llm_timeout: float = 60.0
    # Hard cap on completion tokens for the (structured, short) classify calls — a
    # second guard against a model running away on reasoning/verbose output.
    classify_max_tokens: int = 1200

    # Optional paid escalation at runtime / teacher model for dev-time distillation.
    openai_api_key: str | None = None

    # --- Langfuse (optional LLM tracing) ---
    langfuse_public_key: str | None = None
    langfuse_secret_key: str | None = None
    # Accept either LANGFUSE_HOST (Langfuse standard) or LANGFUSE_BASE_URL.
    langfuse_host: str | None = Field(
        default=None,
        validation_alias=AliasChoices("langfuse_host", "langfuse_base_url"),
    )


# Import-time singleton used across the app.
settings = Settings()
