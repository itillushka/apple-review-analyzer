# Phase 1 — Data Collection Pipeline

This document describes how the system collects, normalizes, and caches App Store
reviews. It covers the data source, the module layout, the key design decisions, and
the known limitations.

## Overview

The pipeline turns an App Store **app id** into a sampled, English-normalized set of
reviews:

```
collect (Apple RSS) ──▶ de-duplicate + sample ──▶ translate to English ──▶ JSON cache
```

All three stages run without any paid API key. Translation and caching are pluggable
and degrade gracefully.

## Data source

Apple exposes customer reviews through a public, key-less RSS endpoint:

```
https://itunes.apple.com/{country}/rss/customerreviews/page={1..10}/id={app_id}/sortby={mostrecent|mosthelpful}/json
```

- Up to **50 reviews per page**, up to **10 pages** per storefront.
- No authentication, no third-party service.
- Each entry carries: rating, title, content, author, `im:version` (app version),
  `updated` (date), and `im:voteCount` / `im:voteSum` (helpfulness).

### Important real-world behavior: intermittent empty feeds

Apple's RSS is **intermittently empty for a given (app, storefront, sort)**. The same
URL can return 50 reviews one minute and an empty feed the next, independently per
storefront. For example, Nebula's `us`/`gb` feeds were observed empty while `in`/`za`
(and later `de`) returned full pages. The collector is built to tolerate this rather
than fail.

## Module layout (`backend/app/`)

| Module | Responsibility |
|--------|----------------|
| `collector.py` | Fetch from Apple RSS, paginate, de-duplicate, sample; incremental top-up |
| `translation.py` | Normalize non-English reviews to English (`title_en`, `content_en`) |
| `storage.py` | JSON-file cache of collection state (no database) |
| `models.py` | `Review`, `CollectionMeta`, `CollectResult`, `CollectionState` |

## Region selection

Reviews are collected by **region**, not a single country, because of the empty-feed
behavior above. A region is an ordered list of storefronts; the collector iterates them
until the pool is filled.

| Region | Storefronts (ordered by volume; English first where available) |
|--------|----------------------------------------------------------------|
| `europe` (default) | gb, ie, de, fr, it, es, nl, se, no, dk, fi, pl, pt, at, be, ch, cz, gr, hu, ro |
| `asia` | in, jp, kr, hk, tw, sg, id, th, vn, ph, my, ae, sa, il, tr |
| `africa` | za, ng, eg, ke, ma, gh, tz, ug, dz, tn |

`meta.countries` reports the storefronts that **actually** supplied reviews (e.g.
`["de", "gb"]`), so the source is always transparent.

## Translation

Reviews arrive in each storefront's language. A translation layer normalizes them to
English so the downstream NLP/insights stack is uniform.

- Reviews from English storefronts (`us, gb, ie, ca, au, nz, in, za, sg`) are passed
  through untouched and marked `language = "en"`.
- Other reviews have `title` / `content` translated into `title_en` / `content_en`.
- The translator is **pluggable**:
  - **Google web** (`deep-translator`) — free, no key — is the default available today.
  - An **LLM translator** (OpenRouter, multilingual) is wired in phase 3.
  - A **null/passthrough** translator is used if translation is unavailable.
- Any single translation failure falls back to the original text — one bad translation
  never sinks the batch.

## Incremental top-up

Collection is **stateful and incremental**. Per `(app_id, region)` the system caches:
the unique reviews gathered, the pagination **cursors**, and the set of **exhausted**
storefront/sort keys.

- A follow-up request that needs more reviews fetches **only the deficit**: each
  storefront resumes from its cursor; storefronts that produced data and then ended are
  skipped; storefronts that were transiently empty are re-probed.
- Fetching stops as soon as the pool reaches the requested `limit`.
- If the cache already satisfies the request, **no network call** is made.

Example: if a first call gathered 80 reviews and a later call needs 100, only ~20 more
are fetched — not all 100. The cache lives under `data/` (git-ignored; zero infra).

## Error handling

- **Invalid app id** (non-numeric) → `InvalidAppIdError`.
- **Unknown region** → `ValueError`.
- **No reviews anywhere** → `NoReviewsError`.
- **Network errors** → retried with exponential backoff, then `CollectorError`.
- **Non-200 page / malformed entry** → skipped; never crashes the batch.
- **Fewer than requested** → returns all available and sets `meta.warning`.

## Usage

```python
from app.collector import collect_reviews
from app.translation import translate_reviews

result = await collect_reviews("1459969523", region="europe", limit=100)
translate_reviews(result.reviews)  # fills title_en / content_en
```

Convenience script (writes the full result to JSON):

```
uv run python scripts/dump_reviews.py [APP_ID] [REGION] [LIMIT] [OUT_PATH]
```

A sample of its output is committed at `samples/1459969523_europe.json`.

## Known limitations

1. **"Random" is approximate.** Apple has no random endpoint; we sample from a pool of
   most-recent + most-helpful reviews, not uniformly across an app's full history.
2. **Storefront mixing under flakiness.** When the leading storefronts are empty, the
   pool may combine several storefronts within the region; `meta.countries` reports this.
3. **Source language is not detected.** `language` is set to `"en"` for English
   storefronts and left `null` otherwise; the translator auto-detects per call.
4. **Sequential fetching.** Pages are fetched sequentially (correctness over speed);
   this can be parallelized later if needed.

## Tests

`backend/tests/` — 11 tests, network mocked with `respx`:

- `test_collector.py` — sampling, field parsing, de-duplication, region selection,
  fewer-than-requested warning, invalid id / region, no-reviews, and the
  **incremental top-up** (asserts already-seen pages are not re-fetched).
- `test_translation.py` — English passthrough, non-English translation, error fallback.
