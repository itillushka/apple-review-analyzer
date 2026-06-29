"""Tiny JSON-file cache for collection state — no database, zero infra.

Persists :class:`~app.models.CollectionState` per (app_id, region) so collection
can be incremental: a follow-up request reuses what was already fetched and only
tops up the deficit. Corrupt or unreadable cache files are treated as a cache miss.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from .config import settings
from .models import AnalysisResult, CollectionState

logger = logging.getLogger(__name__)


def _data_dir() -> Path:
    path = Path(settings.data_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path


def _path(app_id: str, region: str) -> Path:
    return _data_dir() / f"{app_id}_{region}.json"


def load_state(app_id: str, region: str) -> CollectionState | None:
    """Return cached collection state, or ``None`` on a miss / unreadable file."""
    path = _path(app_id, region)
    if not path.exists():
        return None
    try:
        return CollectionState.model_validate_json(path.read_text(encoding="utf-8"))
    except Exception as exc:  # corrupt cache → treat as a miss, don't crash
        logger.warning("Ignoring unreadable cache %s (%s).", path, exc)
        return None


def save_state(state: CollectionState) -> None:
    """Persist collection state to the cache directory."""
    _path(state.app_id, state.region).write_text(
        state.model_dump_json(), encoding="utf-8"
    )


def _analysis_path(app_id: str, region: str) -> Path:
    return _data_dir() / f"{app_id}_{region}_analysis.json"


def load_analysis(app_id: str, region: str) -> AnalysisResult | None:
    """Return a cached analysis result, or ``None`` on a miss / unreadable file."""
    path = _analysis_path(app_id, region)
    if not path.exists():
        return None
    try:
        return AnalysisResult.model_validate_json(path.read_text(encoding="utf-8"))
    except Exception as exc:  # corrupt cache → miss
        logger.warning("Ignoring unreadable analysis cache %s (%s).", path, exc)
        return None


def save_analysis(analysis: AnalysisResult) -> None:
    """Persist a full analysis result to the cache directory."""
    _analysis_path(analysis.app_id, analysis.region).write_text(
        analysis.model_dump_json(), encoding="utf-8"
    )


def _reviews_path(app_id: str, region: str) -> Path:
    return _data_dir() / f"{app_id}_{region}_reviews.json"


def load_reviews(app_id: str, region: str) -> list | None:
    """Return cached enriched reviews (review + sentiment), or None on a miss."""
    path = _reviews_path(app_id, region)
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def save_reviews(app_id: str, region: str, reviews: list) -> None:
    """Persist the enriched reviews (the exact sample the analysis used)."""
    _reviews_path(app_id, region).write_text(
        json.dumps(reviews, ensure_ascii=False), encoding="utf-8"
    )
