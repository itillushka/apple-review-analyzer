# Review Atlas — Apple Store Review Analysis

Collect user reviews from the Apple App Store for any app, process them, and turn them
into metrics and AI-generated insights — exposed through a REST API (and a web dashboard).

> Built as a technical assignment for **OBRIO** (Genesis). The backend is feature-complete;
> the web frontend is in progress.

![Architecture](docs/diagrams/architecture.png)

## What it does

- **Collects** ~100 reviews for any App Store app from Apple's **public reviews RSS**
  (no API key, no third-party service).
- **Translates** non-English reviews to English so the analysis is uniform.
- **Computes metrics** — average rating, star distribution, top/bottom-box, rating by app
  version, monthly trend, plus sentiment-derived metrics (emotion breakdown,
  bug/feature/UX/pricing taxonomy, star↔sentiment mismatch).
- **Generates insights** with an LLM pipeline — sentiment, common themes in negative
  reviews (with examples), and concrete, actionable recommendations.
- **Serves everything** via a documented REST API with raw-data download (JSON / CSV).

## Highlights

- **Robust collection.** Apple's RSS is intermittently empty per storefront, so collection
  is **region-based** (europe / asia / africa) and falls through storefronts until it has
  enough — with an **incremental top-up cache** that only ever fetches the deficit.
- **Real AI, measured.** Insights run through a **LangGraph** state graph
  (classify → synthesize → a deterministic critic that drops hallucinated themes, with a
  re-synthesize loop) on cheap, **top-ranked** OpenRouter models from different vendors.
- **Prompt distillation.** A premium teacher (`gpt-5.5`) is used at dev-time to distill
  few-shot examples for the cheap runtime model — agreement measured **before 95% → after 97%**.
- **Observability.** Every LLM call is traced to **Langfuse**.

## Tech stack

Python · FastAPI · LangGraph · Langfuse · OpenRouter · httpx · Pydantic · uv ·
pytest · Docker. Frontend (in progress): React · Vite · Tailwind · Recharts.

## Quick start (local)

Requirements: Python 3.12, [uv](https://docs.astral.sh/uv/), and an OpenRouter API key.

```bash
cd backend
cp .env.example .env            # add OPENROUTER_API_KEY (+ optional OPENAI_API_KEY, LANGFUSE_*)
uv sync
uv run uvicorn app.main:app --port 8100 --reload
```

Open the interactive docs at **http://localhost:8100/docs**, then try:

```bash
curl "http://localhost:8100/analyze?app_id=1459969523&region=europe&limit=100"
```

(`1459969523` is Nebula.) See **[docs/api-reference.md](docs/api-reference.md)** for the
full API.

## API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/collect` | Collect reviews, return metadata |
| `GET` | `/metrics` | Rating metrics (no LLM) |
| `GET` | `/insights` | Sentiment, emotions, themes, taxonomy, recommendations |
| `GET` | `/analyze` | Full analysis (metrics + insights), cached |
| `GET` | `/reviews/download` | Raw reviews as JSON or CSV |
| `GET` | `/health` | Liveness probe |

## How the AI works

![AI pipeline](docs/diagrams/ai-pipeline.png)

The insights pipeline is a small but real **LangGraph** graph:

1. **classify** — sentiment + emotion per review, batched (`tencent/hy3-preview`).
2. **synthesize** — negative themes, recommendations, and a taxonomy (`deepseek/deepseek-v4-flash`).
3. **critic** — a *deterministic* grounding check that drops any theme not actually present
   in the reviews, looping back to re-synthesize once if needed.

Models are configurable in `backend/app/config.py`. There is no offline fallback — an
`OPENROUTER_API_KEY` is required. Premium-model validation lives only in the dev-time
distillation script (`backend/scripts/distill_prompts.py`), not in the request path.

## Testing

```bash
cd backend && uv run pytest        # 28 tests (collector, metrics, insights graph, API)
```

The LLM tests make **real** OpenRouter calls (and skip cleanly without a key).

## Docker & deployment

```bash
docker compose up -d --build api   # backend container (api)
docker compose up -d --build       # api + web (once the frontend lands)
```

Full VPS deployment (Docker Compose + nginx + certbot) is documented in
**[DEPLOY.md](DEPLOY.md)**.

## Project structure

```
backend/         FastAPI app, pipeline, LangGraph insights, tests
  app/           collector · translation · processing · metrics · insights/ · service · main
  scripts/       dump_reviews.py · distill_prompts.py
frontend/        Vite/React app (in progress) + Dockerfile/nginx
docs/            api-reference.md · data-collection.md · diagrams/ · plans/
deploy/          host nginx config (TLS)
```

## Design decisions

- **Apple public RSS** over scraping or the App Store Connect API — no key, works for any app.
- **Region + incremental cache** to survive Apple's per-storefront empty-feed flakiness
  while fetching as little as possible.
- **Cheap top-ranked LLMs + distillation** rather than a single premium model — fast and
  inexpensive at runtime, with the quality gap to a premium model measured and closed.
- **No database** — a JSON file cache keeps the deployment dependency-free.
