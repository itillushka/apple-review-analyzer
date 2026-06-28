# Build Plan & Progress — Apple Store Review Analysis

Living tracker for the OBRIO test task. Update checkboxes + the phase status emoji as we go.
**One commit per phase** (Conventional Commits). Full design rationale lives in the local
design plan (`~/.claude/plans/quiet-crunching-mist.md`).

**Legend:** ☐ todo · 🔄 in progress · ✅ done · ⛔ blocked (needs input)

## External dependencies (provide when the phase needs it)
| Need | For phase | Status |
|------|-----------|--------|
| OpenRouter API key (free tier) | 3 — LLM nodes | ⛔ pending |
| Paid teacher key (OpenAI/Claude) | 3b — distillation | ⛔ pending |
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
- commits: `feat: collect App Store reviews via Apple RSS` · `feat: region-based collection` ·
  `feat: translation layer (multilingual reviews → English)`

## Phase 2 — Processing + rating metrics ☐
- [ ] `app/processing.py` — clean/normalize text (raw + cleaned)
- [ ] `app/metrics.py` — avg, distribution, top/bottom-box, by-version, monthly trend
- [ ] tests
- commit: `feat: text processing and rating metrics`

## Phase 3 — Insights graph (LangGraph) ☐
- [ ] `insights/nodes_local.py` — VADER + YAKE + rule-based (offline fallback)
- [ ] `insights/graph.py` — StateGraph: classify → mine_themes → detect_mismatch →
      synthesize → critic (loop); conditional backend edge; structured-output retry
- [ ] `insights/nodes_llm.py` — free OpenRouter models, task-routed
- [ ] `insights/tracing.py` — Langfuse (env-gated, no-op if unset)
- [ ] tests (mocked LLM)
- commit: `feat: LangGraph insights pipeline with local fallback`
- ⛔ needs OpenRouter key for the LLM path (local path testable without)

## Phase 3b — Prompt distillation (dev-time) ☐
- [ ] `scripts/distill_prompts.py` — teacher gold outputs on a fixed sample
- [ ] `app/insights/prompts/*.md` — distilled prompts + few-shots + JSON schema
- [ ] `backend/evals/` — free-vs-teacher agreement + JSON-validity eval
- commit: `feat: prompt distillation and insights eval`
- ⛔ needs paid teacher key

## Phase 4 — Sentiment-derived metrics ☐
- [ ] mismatch, emotion breakdown, bug/feature/UX/pricing taxonomy, ranked themes
- commit: `feat: sentiment-derived metrics`

## Phase 5 — REST API ☐
- [ ] `app/models.py` (pydantic schemas)
- [ ] endpoints: `/collect /metrics /insights /analyze /reviews/download /charts /health`
- [ ] `tests/test_api.py` (happy path + bad id + local-fallback)
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
