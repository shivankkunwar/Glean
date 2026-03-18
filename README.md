# Glean

A single-user Nuxt 4 app for saving URLs, extracting metadata, organizing with categories/tags, and searching in a local SQLite store.

## Why this exists

- Save links quickly with async background processing
- Extract metadata and a preview image where possible
- Keep content private in a local `.db` file
- Search with built-in FTS5 text index
- Expose a PWA with share-target integration stub for mobile workflows

## Quick start

```bash
cd glean
npm install
cp .env.example .env
npm run dev
```

Default app page: `http://localhost:3000`.

Sign in using `ADMIN_PASSWORD` from your `.env`.

## Environment

Create `.env` from `.env.example` and set at least:

```
ADMIN_PASSWORD=<your password>
```

Optional overrides:

- `DATABASE_PATH` (default `./glean.db`)
- `GLEAN_SESSION_TOKEN` (custom session token)

Optional AI (free-only profile by default):

- `AI_PROVIDER` (`auto` or `openrouter`, default `auto`)
- `AI_COST_MODE` (default `free-only`)
- `AI_EMBED_PROVIDER` (`gemini` default)
- `AI_OPENROUTER_API_KEY`
- `AI_OPENROUTER_CLASSIFY_MODEL` (default `nvidia/nemotron-3-super-120b-a12b:free`)
- `AI_OPENROUTER_SUMMARY_MODEL` (default `nvidia/nemotron-3-super-120b-a12b:free`)
- `AI_OPENROUTER_CLASSIFY_FALLBACKS` (priority order, comma-separated)
- `AI_OPENROUTER_SUMMARY_FALLBACKS` (priority order, comma-separated)
- `GEMINI_API_KEY`
- `AI_GEMINI_EMBED_MODEL` (default `gemini-embedding-2-preview`) - Latest multimodal embedding model
- `AI_CLASSIFY_PAYLOAD_TOKENS`, `AI_SUMMARIZE_PAYLOAD_TOKENS`, `AI_EMBED_PAYLOAD_TOKENS`

If keys are missing, AI stages should skip and the app remains fully usable with keyword search.

## Scripts

```bash
npm run dev         # local dev
npm run build       # compile SSR bundle
npm run start       # run production bundle
npm run preview     # preview after build
npm run db:generate # generate drizzle SQL
npm run db:push     # push schema to sqlite
```

## Routes and APIs

- `POST /api/login`, `POST /api/logout`, `GET /api/session` — auth
- `POST /api/save` — submit a URL
- `POST /api/share` — share target handler
- `GET /api/bookmarks` — list bookmarks
- `GET /api/search` — keyword search over title/description/content
- `GET /api/categories` / `POST /api/categories` — category management
- `GET /api/tags` / `POST /api/tags` — tag listing and creation
- `GET /api/jobs` — inspect queue state

## Current behavior

- Save flow is fast and returns a bookmark id immediately.
- Background extraction updates records to `done` and enriches metadata.
- Duplicate URLs are deduped by hash and return existing rows as `duplicate: true`.
- Category filters work through `GET /api/bookmarks?categoryId=<id>` and sidebar selection.

## Deployment notes

1. Run `npm run build` on the target host.
2. Start with `npm run start`.
3. Persist the SQLite file at a writable path.
4. Serve over HTTPS for secure cookies and stable PWA behavior.
