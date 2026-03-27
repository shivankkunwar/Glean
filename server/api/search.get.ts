import { defineEventHandler, getQuery } from 'h3';
import { getDb } from '../utils/db';
import { resolveProvider } from '../utils/ai';
import { findNearestNeighbors } from '../utils/embeddings';
import { executeKeywordSearch, filterByCategoryId } from '../utils/search';
import { MAX_PAGE_LIMIT, MAX_EMBEDDING_RESULTS, MIN_SIMILARITY_SCORE } from '../utils/constants';
import { getCookie } from 'h3';
import { isSessionValid, AUTH_COOKIE } from '../utils/auth';

function reciprocalRankFusion(
  ftsRanks: Array<{ id: number; rank: number }>,
  vecScores: Array<{ bookmarkId: number; score: number }>,
  k: number = 60
): Array<{ id: number; score: number }> {
  const ftsMap = new Map<number, number>();
  const vecMap = new Map<number, number>();

  ftsRanks.forEach((item, index) => {
    ftsMap.set(item.id, 1 / (k + index + 1));
  });

  const sortedVec = [...vecScores].sort((a, b) => b.score - a.score);
  sortedVec.forEach((item, index) => {
    vecMap.set(item.bookmarkId, 1 / (k + index + 1));
  });

  const allIds = new Set([...ftsMap.keys(), ...vecMap.keys()]);

  const fused = Array.from(allIds).map((id) => ({
    id,
    score: (ftsMap.get(id) || 0) + (vecMap.get(id) || 0)
  }));

  return fused.sort((a, b) => b.score - a.score);
}

async function performSemanticSearch(q: string, categoryId: number | null, limit: number, offset: number) {
  const { client } = getDb();
  const provider = resolveProvider('embed', {
    sourceType: 'generic',
    url: '',
    canonicalText: q,
    tokenEstimate: Math.ceil(q.length / 4)
  });

  const embedResult = await provider.embed([q]);

  if (embedResult.skipped || !embedResult.vectors.length) {
    return executeKeywordSearch({ query: q, categoryId: categoryId ?? undefined, limit, offset });
  }

  // Fix vectors possibly undefined
  const queryVector = embedResult.vectors[0];
  if (!queryVector) {
    return executeKeywordSearch({ query: q, categoryId: categoryId ?? undefined, limit, offset });
  }

  const vectorResults = findNearestNeighbors(queryVector, MAX_EMBEDDING_RESULTS, MIN_SIMILARITY_SCORE);

  let filteredResults = categoryId ? filterByCategoryId(vectorResults, categoryId) : vectorResults;
  const paginated = filteredResults.slice(offset, offset + limit);

  const items = paginated.map((result) => {
    const row = client
      .prepare(
        `SELECT
          b.id,
          b.url,
          b.title,
          b.description,
          b.summary,
          b.og_image,
          b.favicon,
          b.domain,
          b.status,
          b.ai_status,
          b.source_type,
          b.created_at
         FROM bookmarks b
         WHERE b.id = ?`
      )
      .get(result.bookmarkId) as Record<string, unknown> | undefined;

    if (!row) return null;

    return {
      id: Number(row.id),
      url: String(row.url),
      title: row.title ? String(row.title) : null,
      description: row.description ? String(row.description) : null,
      summary: row.summary ? String(row.summary) : null,
      ogImage: row.og_image ? String(row.og_image) : null,
      favicon: row.favicon ? String(row.favicon) : null,
      domain: row.domain ? String(row.domain) : null,
      status: String(row.status),
      aiStatus: row.ai_status ? String(row.ai_status) : null,
      sourceType: row.source_type ? String(row.source_type) : null,
      createdAt: String(row.created_at),
      score: result.score,
      tags: []
    };
  }).filter(Boolean);

  return { items, total: filteredResults.length };
}

async function performHybridSearch(q: string, categoryId: number | null, limit: number, offset: number) {
  const { client } = getDb();
  const provider = resolveProvider('embed', {
    sourceType: 'generic',
    url: '',
    canonicalText: q,
    tokenEstimate: Math.ceil(q.length / 4)
  });

  const embedResult = await provider.embed([q]);

  let vectorResults: Array<{ bookmarkId: number; score: number }> = [];
  if (!embedResult.skipped && embedResult.vectors.length && embedResult.vectors[0]) {
    vectorResults = findNearestNeighbors(embedResult.vectors[0], MAX_EMBEDDING_RESULTS, MIN_SIMILARITY_SCORE);
  }

  const { items: ftsItems } = executeKeywordSearch({ query: q, categoryId: categoryId ?? undefined, limit: 50, offset: 0 });
  const ftsRanks = ftsItems.map((item, index) => ({ id: item.id, rank: index }));

  const filteredVectorResults = categoryId ? filterByCategoryId(vectorResults, categoryId) : vectorResults;
  const vecScores = filteredVectorResults.map((r) => ({ bookmarkId: r.bookmarkId, score: r.score }));

  const fused = reciprocalRankFusion(ftsRanks, vecScores, 60);
  const paginated = fused.slice(offset, offset + limit);

  const items = paginated.map((result) => {
    const row = client
      .prepare(
        `SELECT
          b.id,
          b.url,
          b.title,
          b.description,
          b.summary,
          b.og_image,
          b.favicon,
          b.domain,
          b.status,
          b.ai_status,
          b.source_type,
          b.created_at
         FROM bookmarks b
         WHERE b.id = ?`
      )
      .get(result.id) as Record<string, unknown> | undefined;

    if (!row) return null;

    return {
      id: Number(row.id),
      url: String(row.url),
      title: row.title ? String(row.title) : null,
      description: row.description ? String(row.description) : null,
      summary: row.summary ? String(row.summary) : null,
      ogImage: row.og_image ? String(row.og_image) : null,
      favicon: row.favicon ? String(row.favicon) : null,
      domain: row.domain ? String(row.domain) : null,
      status: String(row.status),
      aiStatus: row.ai_status ? String(row.ai_status) : null,
      sourceType: row.source_type ? String(row.source_type) : null,
      createdAt: String(row.created_at),
      score: result.score,
      tags: []
    };
  }).filter(Boolean);

  return { items, total: fused.length };
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const q = String(query.q || '').trim();

  // Public users (no valid session) are restricted to keyword search only.
  // This prevents AI embedding API quota from being consumed by anonymous traffic.
  const token = getCookie(event, AUTH_COOKIE);
  const isAuthenticated = isSessionValid(token);
  const rawMode = String(query.mode || 'keyword');
  const mode = isAuthenticated ? rawMode : 'keyword';
  const page = Number(query.page ?? 1);
  const limit = Math.min(Number(query.limit ?? 24), MAX_PAGE_LIMIT);
  const offset = (Math.max(page, 1) - 1) * limit;
  const categoryId = Number(query.categoryId ?? NaN);
  const validCategoryId = Number.isFinite(categoryId) ? categoryId : null;

  if (!q) {
    return { items: [], total: 0, q: '', mode };
  }

  try {
    if (mode === 'keyword') {
      const { items, total, strategy } = executeKeywordSearch({ query: q, categoryId: validCategoryId ?? undefined, limit, offset });
      return { items, total, q, mode, page, limit, strategy };
    }

    if (mode === 'semantic') {
      const { items, total } = await performSemanticSearch(q, validCategoryId, limit, offset);
      return { items, total, q, mode, page, limit };
    }

    if (mode === 'hybrid') {
      const { items, total } = await performHybridSearch(q, validCategoryId, limit, offset);
      return { items, total, q, mode, page, limit };
    }

    return { items: [], total: 0, q, mode, page, limit };
  } catch (error) {
    const { items, total, strategy } = executeKeywordSearch({ query: q, categoryId: validCategoryId ?? undefined, limit, offset });
    return {
      items,
      total,
      q,
      mode,
      page,
      limit,
      strategy,
      fallback: 'keyword',
      reason: error instanceof Error ? error.message : 'Search error'
    };
  }
});