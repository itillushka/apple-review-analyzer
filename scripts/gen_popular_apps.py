"""Generate frontend/src/popularApps.js from Apple's public App Store data.

A static table (name + id + icon) powers the name-autocomplete search box. Baking it
in keeps search instant and avoids hammering the Store API on every keystroke — this
is a take-home demo, not a production catalog. Users can still paste any App Store
URL / numeric id to go beyond the list.

The table combines three sources:
  1. EXPLICIT ids — the apps this demo centers on (Nebula + Co-Star).
  2. Top charts — top free / grossing / paid (general popular apps).
  3. Spiritual/astrology search — Nebula's category, so reviewers can find competitors.

Usage (from the repo root):
    python3 scripts/gen_popular_apps.py
"""

from __future__ import annotations

import json
import urllib.parse
import urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "frontend" / "src" / "popularApps.js"
COUNTRY = "us"  # English display names
CHARTS = ("topfreeapplications", "topgrossingapplications", "toppaidapplications")
CHART_LIMIT = 100
# Apps this demo is built around — pinned so they're always searchable.
EXPLICIT_IDS = ("1459969523", "1264782561")  # Nebula, Co-Star
# Nebula's domain — pull its category so reviewers can compare against rivals.
SEARCH_TERMS = ("astrology", "horoscope", "tarot", "spiritual", "numerology", "meditation")
SEARCH_LIMIT = 12


def _get(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "review-atlas/0.1"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def _entry(aid: str, name: str | None, icon: str | None) -> dict:
    return {"id": aid, "name": name, "icon": icon}


def add(apps: dict, order: list, aid: str, name: str | None, icon: str | None) -> None:
    if not aid or aid in apps or not name:
        return
    apps[aid] = _entry(aid, name, icon)
    order.append(aid)


def main() -> None:
    apps: dict[str, dict] = {}
    order: list[str] = []

    # 1. Explicit ids (iTunes Lookup) — keep them at the front of the list.
    for aid in EXPLICIT_IDS:
        try:
            results = _get(f"https://itunes.apple.com/lookup?id={aid}&country={COUNTRY}").get("results", [])
            if results:
                r = results[0]
                add(apps, order, aid, r.get("trackName"), r.get("artworkUrl100") or r.get("artworkUrl60"))
        except Exception as exc:
            print(f"warning: lookup {aid} failed ({exc})")

    # 2. Spiritual / astrology category (search) — added before the general charts so it
    #    always survives the size cap below (Nebula's domain matters most here).
    for term in SEARCH_TERMS:
        try:
            q = urllib.parse.quote(term)
            results = _get(f"https://itunes.apple.com/search?term={q}&entity=software&limit={SEARCH_LIMIT}&country={COUNTRY}").get("results", [])
            for r in results:
                add(apps, order, str(r.get("trackId") or ""), r.get("trackName"),
                    r.get("artworkUrl100") or r.get("artworkUrl60"))
        except Exception as exc:
            print(f"warning: search {term} failed ({exc})")

    # 3. Top charts (general popular apps) — fills out the rest of the table.
    for kind in CHARTS:
        try:
            feed = _get(f"https://itunes.apple.com/{COUNTRY}/rss/{kind}/limit={CHART_LIMIT}/json")
            for e in feed["feed"]["entry"]:
                images = e.get("im:image", [])
                add(apps, order, e["id"]["attributes"]["im:id"], e["im:name"]["label"],
                    images[-1]["label"] if images else None)
        except Exception as exc:
            print(f"warning: chart {kind} failed ({exc})")

    # Cap the bundle size. Explicit + spiritual come first, so they're always kept;
    # the general top-charts tail is trimmed.
    table = [apps[a] for a in order[:160]]
    header = (
        "// Auto-generated from Apple's public App Store data: Nebula + Co-Star (pinned),\n"
        "// top charts (free / grossing / paid, US), and the spiritual/astrology category.\n"
        "// A static table so name search is instant and never hammers the Store API — this\n"
        "// is a take-home demo, not a production catalog. Paste any App Store URL / numeric\n"
        "// ID to go beyond this list. Regenerate via scripts/gen_popular_apps.py.\n"
        "export const POPULAR_APPS = "
    )
    OUT.write_text(header + json.dumps(table, ensure_ascii=False) + ";\n", encoding="utf-8")
    print(f"wrote {len(table)} apps -> {OUT}")
    print("spiritual sample:", [a["name"] for a in table if a["id"] in EXPLICIT_IDS])


if __name__ == "__main__":
    main()
