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
    model_classify: str = "tencent/hy3-preview"  # #2 by tokens, cheapest
    model_synthesize: str = "deepseek/deepseek-v4-flash"  # #1 by tokens, 1M ctx
    model_teacher: str = "gpt-5.5"  # OpenAI, dev-time distillation/eval only

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
