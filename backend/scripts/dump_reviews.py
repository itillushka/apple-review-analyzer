"""Collect reviews for an app, translate to English, and dump everything to JSON.

A convenience utility for inspecting the collection + translation pipeline output.

Usage (from the ``backend`` directory):
    uv run python scripts/dump_reviews.py [APP_ID] [REGION] [LIMIT] [OUT_PATH]

Defaults to Nebula, europe, 100 reviews, written to ``../samples/<app>_<region>.json``.
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

# Make the `app` package importable when run as a plain script.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.collector import collect_reviews  # noqa: E402
from app.translation import translate_reviews  # noqa: E402


async def main() -> None:
    app_id = sys.argv[1] if len(sys.argv) > 1 else "1459969523"  # Nebula
    region = sys.argv[2] if len(sys.argv) > 2 else "europe"
    limit = int(sys.argv[3]) if len(sys.argv) > 3 else 100
    out = (
        Path(sys.argv[4])
        if len(sys.argv) > 4
        else Path(__file__).resolve().parents[2] / "samples" / f"{app_id}_{region}.json"
    )

    print(f"Collecting {limit} reviews for app {app_id} (region={region})...")
    result = await collect_reviews(app_id, region=region, limit=limit)
    print(f"  collected {result.meta.returned} (sources: {result.meta.countries})")

    print("Translating to English...")
    translate_reviews(result.reviews)

    out.parent.mkdir(parents=True, exist_ok=True)
    payload = result.model_dump(mode="json")
    out.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {result.meta.returned} reviews + metadata to {out}")


if __name__ == "__main__":
    asyncio.run(main())
