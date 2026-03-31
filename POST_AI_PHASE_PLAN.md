# Post-Implementation AI/Platform Phase Plan

This file defines what comes after the AI processing foundation (`AI_PROCESSING_PLAN.md`) is implemented.

## Positioning

- **Current completed baseline**: URL save + queue + extraction + bookmark APIs + filters + auth + docs.
- **Current plan in progress**: AI architecture design and modular provider abstraction.
- **Next phase goal**: ship the product as a stable v1 with AI as optional value-add and robust deployment.

## Next phase outcome

At the end of this phase, Glean should support:

1. `mode=keyword|semantic|hybrid` search.
2. Optional AI processing without hard dependency on any provider.
3. Tag/category/summary generation stored as versioned artifacts.
4. Reproducible and observable background processing.
5. Reliable deployment package (`Dockerfile` + `docker-compose.yml`).
6. Share flow UX polish for mobile PWA path.

## Phase map (next)

### Phase A — AI execution (mandatory before full ship)

- Implement provider abstraction and local fallback.
- Add normalized canonical text and AI artifacts tables.
- Add AI jobs: summarize, classify, embed, reindex.
- Add `/api/search` mode support (`keyword`, `semantic`, `hybrid`).
- Add `/api/jobs` surface as operator workflow.

### Phase B — Delivery and robustness

- Offline/queued share handling in service worker (or clear fallback path).
- Retry hardening, timeouts, safe extraction rules.
- Queue visibility and manual re-process command.

### Phase C — Ship and docs

- Docker + compose + data persistence.
- Open-source friendly onboarding (`README`, env reference, sample compose).
- Production runbook and quick smoke check checklist.

## Dependency assumptions

- AI implementation can ship with no provider configured.
- Search improvements should not break current FTS behavior.
- Build artifacts should remain small and deterministic.

## Success criteria for this phase

- Save-to-card flow still <100ms for initial insertion.
- Background status moves from `pending` → `done` in a reasonable window.
- Search remains usable with and without embeddings.
- Users can run from clone in under 5 minutes (with optional AI disabled).

## Suggested milestone sequence

1. `TASKS_AI_PHASE.md` tasks 1-8 (core AI pipeline)
2. Tasks 9-12 (semantic/hybrid search + ranking)
3. Tasks 13-16 (share polish + deploy)
4. Manual verification pass with matrix below

## Manual verification matrix (minimum)

- Save URL and confirm card appears in <5s.
- Search keyword for known title and check ranking.
- Disable AI env and verify app still functions.
- Enable AI env and verify tags/summary appear.
- Run compose stack and confirm `/output/bookmarks` persists.
