"""Generate frontend/src/popularApps.js from Apple's public App Store top charts.

A static table of ~100 popular apps (name + id + icon) powers the name-autocomplete
search box. Baking it in keeps search instant and avoids hammering the Store API on
every keystroke — this is a take-home demo, not a production catalog. Users can still
paste any App Store URL / numeric id to go beyond the list.

Usage (from the repo root):
    python3 scripts/gen_popular_apps.py
"""

from __future__ import annotations

import json
import urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "frontend" / "src" / "popularApps.js"
CHARTS = ("topfreeapplications", "topgrossingapplications", "toppaidapplications")
LIMIT = 100
COUNTRY = "us"  # English display names


def fetch(kind: str) -> list[dict]:
    url = f"https://itunes.apple.com/{COUNTRY}/rss/{kind}/limit={LIMIT}/json"
    req = urllib.request.Request(url, headers={"User-Agent": "review-atlas/0.1"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)["feed"]["entry"]


def main() -> None:
    apps: dict[str, dict] = {}
    order: list[str] = []
    for kind in CHARTS:
        try:
            for e in fetch(kind):
                aid = e["id"]["attributes"]["im:id"]
                if aid in apps:
                    continue
                images = e.get("im:image", [])
                apps[aid] = {
                    "id": aid,
                    "name": e["im:name"]["label"],
                    "icon": images[-1]["label"] if images else None,
                }
                order.append(aid)
        except Exception as exc:  # one chart failing shouldn't sink the rest
            print(f"warning: {kind} failed ({exc})")

    top = [apps[a] for a in order[:100]]
    header = (
        "// Auto-generated from Apple's public App Store top charts (top free / grossing / paid, US).\n"
        "// A static table so name search is instant and never hammers the Store API — this is a\n"
        "// take-home demo, not a production catalog. Paste any App Store URL / numeric ID to go\n"
        "// beyond this list. Regenerate via scripts/gen_popular_apps.py.\n"
        "export const POPULAR_APPS = "
    )
    OUT.write_text(header + json.dumps(top, ensure_ascii=False) + ";\n", encoding="utf-8")
    print(f"wrote {len(top)} apps -> {OUT}")


if __name__ == "__main__":
    main()
