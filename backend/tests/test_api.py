"""API tests via FastAPI's TestClient.

The metrics/download tests hit Apple's public RSS (no key) but are served from the
local collection cache after the first run, so they stay fast and stable.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app

client = TestClient(app)

NEBULA = "1459969523"


@pytest.fixture(autouse=True)
def _disable_auth(monkeypatch):
    """Most tests run with the access gate off; the auth test re-enables it."""
    monkeypatch.setattr(settings, "access_token", None)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_root_points_to_docs():
    assert client.get("/").json()["docs"] == "/docs"


def test_invalid_app_id_returns_400():
    r = client.get("/metrics", params={"app_id": "not-numeric"})
    assert r.status_code == 400


def test_invalid_region_returns_422():
    # Region is constrained by the query pattern → FastAPI validation (422).
    r = client.get("/metrics", params={"app_id": NEBULA, "region": "mars"})
    assert r.status_code == 422


def test_metrics_endpoint_live():
    r = client.get("/metrics", params={"app_id": NEBULA, "region": "europe", "limit": 60})
    assert r.status_code == 200
    body = r.json()
    assert body["metrics"]["total"] >= 1
    assert set(body["metrics"]["distribution"]) == {"1", "2", "3", "4", "5"}


def test_access_token_gate(monkeypatch):
    monkeypatch.setattr(settings, "access_token", "s3cret")
    # No token → 401 on a gated endpoint and on the verify check.
    assert client.get("/auth/verify").status_code == 401
    assert client.get("/metrics", params={"app_id": NEBULA}).status_code == 401
    # Correct token → verify passes (no network needed).
    ok = client.get("/auth/verify", headers={"X-Access-Token": "s3cret"})
    assert ok.status_code == 200 and ok.json() == {"ok": True}


def test_download_csv_live():
    r = client.get(
        "/reviews/download",
        params={"app_id": NEBULA, "region": "europe", "limit": 40, "format": "csv"},
    )
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/csv")
    assert r.text.splitlines()[0].startswith("id,rating,title")
