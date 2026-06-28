"""FastAPI application entry point.

For now this exposes only system endpoints (`/health`, `/`). Data collection,
metrics, insights, and download endpoints are added in later phases — see the
build tracker at ``docs/plans/2026-06-28-build-plan.md``.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings

app = FastAPI(title=settings.app_name, version=settings.app_version)

# Allow the browser frontend (Vite dev / same host) to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    """Liveness probe for Docker / uptime checks and the deploy reverse proxy."""
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.app_version,
    }


@app.get("/", tags=["system"])
def root() -> dict[str, str]:
    """Tiny landing payload pointing clients at the interactive API docs."""
    return {
        "service": settings.app_name,
        "docs": "/docs",
        "health": "/health",
    }
