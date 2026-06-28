"""Application configuration via environment variables.

Settings are read from the process environment and an optional ``.env`` file.
Only the values needed by the current build phase are actively used; the
LLM / Langfuse keys are declared here as optional placeholders so later phases
can rely on them without changing the import surface (keeps the prefix stable).
"""

from __future__ import annotations

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
    # Origins allowed to call the API from a browser (Vite dev + same-host).
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:8100",
    ]

    # --- LLM: OpenRouter (wired in phase 3) ---
    openrouter_api_key: str | None = None
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    # Optional paid escalation at runtime / teacher model for dev-time distillation.
    openai_api_key: str | None = None

    # --- Langfuse (optional LLM tracing, phase 3) ---
    langfuse_public_key: str | None = None
    langfuse_secret_key: str | None = None
    langfuse_host: str | None = None


# Import-time singleton used across the app.
settings = Settings()
