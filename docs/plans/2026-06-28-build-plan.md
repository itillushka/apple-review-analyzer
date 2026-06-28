# Build Plan & Progress — Apple Store Review Analysis

Living tracker for the OBRIO test task. Update checkboxes + the phase status emoji as we go.
**One commit per phase** (Conventional Commits). Full design rationale lives in the local
design plan (`~/.claude/plans/quiet-crunching-mist.md`).

**Legend:** ☐ todo · 🔄 in progress · ✅ done · ⛔ blocked (needs input)

## External dependencies (provide when the phase needs it)
| Need | For phase | Status |
|------|-----------|--------|
| OpenRouter API key (free tier) | 3 — LLM nodes | ✅ provided (validated) |
| Paid teacher key (OpenAI) | 3b — distillation | ✅ provided |
| Langfuse keys | 3 — tracing | ✅ provided |
| SSH access + subdomain to VPS | 11 — deploy | ⛔ pending |

---

## Phase 0 — Scaffold (backend) ✅
- [x] Repo: git init, README, .gitignore, public GitHub repo
- [x] `backend/` uv project (`pyproject.toml`), `app/` package
- [x] `app/config.py` (pydantic-settings), `app/main.py` (FastAPI + CORS + `/health`)
- [x] `.env.example`
- [x] `uv sync` + `/health` smoke test
- commit: `chore: scaffold FastAPI backend with health endpoint`

## Phase 1 — Data collection ✅
- [x] `app/collector.py` — Apple RSS fetch, pagination, sampling (pool → 100), de-dup
- [x] Error handling (invalid id, network retry, <100, empty feed)
- [x] `tests/test_collector.py` (7 tests, mocked httpx)
- [x] Region-based: **europe** (default) / asia / africa; iterates a region's storefronts
  to survive Apple's per-storefront empty-feed flakiness; `meta.countries` = real sources.
- [x] **Translation layer** (`translation.py`): region reviews → English; free no-key Google
  backend now (LLM backend in phase 3); English storefronts passthrough; error-fallback to original.
- [x] **Incremental top-up** (`storage.py` JSON cache): cursors + exhausted-storefront tracking
  → a follow-up fetches only the deficit (short by 20 → fetch ~20, not all 100); cache hit = no network.
- [x] **Documented** in `docs/data-collection.md`; sample output `samples/1459969523_europe.json`;
  utility `scripts/dump_reviews.py`. **11 tests green.**
- commits: `feat: collect App Store reviews via Apple RSS` · `feat: region-based collection` ·
  `feat: translation layer` · `feat: incremental top-up` · `chore: dump utility` · `docs: data collection`

**✅ Phase 1 CLOSED.**

## Phase 2 — Processing + rating metrics ✅
- [x] `app/processing.py` — `clean_text` + `preprocess_reviews` (NFKC, strip HTML/URLs,
  collapse whitespace) → `title_clean`/`content_clean` from English text.
- [x] `app/metrics.py` — avg, star distribution (count + %), top/bottom-box, rating by
  app version, monthly trend, per-country, date range.
- [x] tests (`test_processing.py`, `test_metrics.py`). **17 tests green.**
- commit: `feat: text processing and rating metrics`

## Phase 3 — Insights graph (LangGraph) ✅
- [x] `insights/llm.py` — **top-ranked OpenRouter models** (classify=Tencent Hy3,
  synthesize=DeepSeek V4 Flash), batched classification + theme/recommendation synthesis,
  robust JSON parse + retry, **Langfuse tracing**.
- [x] Real (live) integration test `test_insights_llm.py` — skips without key.
- [x] `insights/graph.py` — **LangGraph** StateGraph: classify → synthesize →
  **deterministic critic** (grounding check) with re-synthesize loop.
- [x] ~~`insights/local.py` (VADER+YAKE offline fallback)~~ **REMOVED** — the cheap LLM
  models (95–97% agreement with gpt-5.5) make the low-quality local path dead weight;
  insights now require an OpenRouter key (no graceful degradation).
- [x] **Langfuse tracing** active (verified): all LLM calls traced to Langfuse Cloud.
- [x] Decision: runtime critic is deterministic/cheap; **premium OpenAI is dev-time only**
  (teacher for phase 3b). **23 tests green** (live LLM tests included).
- commit: `feat: local insights backend` · `feat: LLM insights backend` · `feat: LangGraph graph + critic`

## Phase 3b — Prompt distillation (dev-time) ✅
- [x] `scripts/distill_prompts.py` — teacher (gpt-5.5) labels 100 reviews as gold; measures
  student (`tencent/hy3-preview`) agreement **before vs after** few-shot distillation.
- [x] `app/insights/prompts/classify_fewshot.json` — distilled few-shots (corrective cases),
  injected into the runtime classify prompt.
- [x] `evals/distillation_report.md` — **before 95.0% → after 97.0% (+2.0 pp)** agreement.
- commit: `feat: prompt distillation with before/after eval`

## Phase 4 — Sentiment-derived metrics ✅
- [x] **star↔sentiment mismatch** (`metrics.compute_mismatch`, deterministic) — 4–5★ with
  negative text or 1–2★ with positive text.
- [x] **emotion breakdown** — LLM classifies emotion per review (joy/anger/frustration/…);
  local backend maps sentiment→coarse emotion.
- [x] **taxonomy** bug/feature_request/ux/pricing/other — LLM in synthesize; local via keyword rules.
- [x] `insights/derived.py` centralizes assembly so local + LLM + graph emit identical shape.
- [x] `model_teacher = gpt-5.5` set for phase 3b. **24 tests green** (live LLM included).
- commit: `feat: sentiment-derived metrics (emotion, taxonomy, mismatch)`

## Phase 5 — REST API ✅
- [x] `app/service.py` — pipeline orchestration (collect→translate→preprocess→metrics+insights),
  heavy work off the event loop (`asyncio.to_thread`), full-analysis cache (`storage`).
- [x] Endpoints: `POST /collect`, `GET /metrics` (no LLM), `GET /insights`, `GET /analyze`
  (cached), `GET /reviews/download` (json/csv), `/health`, auto-Swagger `/docs`.
- [x] Domain errors → HTTP (invalid id → 400, bad region → 422, no reviews → 404).
- [x] `tests/test_api.py` (6 tests, TestClient). **30 tests green.** (`/charts` → Phase 6.)
- commit: `feat: REST API endpoints`

## Phase 6 — Visualization ☐
- [ ] `app/viz.py` — matplotlib PNGs (rating, sentiment, by-version, trend)
- commit: `feat: chart generation for reports`

## Phase 7 — Frontend ☐
- [ ] Commit design reference (`docs/design/` from CloudDesign export)
- [ ] `frontend/` Vite+React+TS+Tailwind; Dala tokens; fix 24px-radius + drop texture nits
- [ ] Pages: Home, Dashboard, Reviews Explorer, Compare, About; 3 popups; states; motion
- [ ] Recharts wired to the API
- commit: `feat: React frontend (Dala design system)`

## Phase 8 — Sample report ☐
- [ ] `scripts/generate_report.py` → `reports/sample_report.md` (Nebula vs Co–Star)
- commit: `docs: sample report (Nebula vs Co–Star)`

## Phase 9 — Architecture docs ☐
- [ ] `docs/ADR-001-architecture.md` + diagram (process-map skill)
- [ ] `docs/demo-script-ua.md` (Ukrainian video scenario)
- commit: `docs: architecture ADR, diagram, demo script`

## Phase 10 — README (full) ☐
- [ ] Setup, approach, design decisions, curl examples, report link
- commit: `docs: complete README`

## Phase 11 — Deploy ☐
- [ ] `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml`
- [ ] nginx + certbot on personal VPS; live URL
- commit: `chore: docker + deployment config`
- ⛔ needs SSH + subdomain

## Phase 12 — Final pass ☐
- [ ] full test suite green, frontend build, smoke via site + Swagger, polish
- commit: `chore: final polish`
