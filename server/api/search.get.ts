import { defineEventHandler, getQuery } from 'h3';
import { getDb } from '../utils/db';

export default defineEventHandler((event) => {
  const query = getQuery(event);
  const q = String(query.q || '').trim();
  const page = Number(query.page ?? 1);
  const limit = Math.min(Number(query.limit ?? 24), 60);
  const offset = (Math.max(page, 1) - 1) * limit;
  const categoryId = Number(query.categoryId ?? NaN);

  if (!q) {
    return { items: [], total: 0, q: '' };
  }

  const { client } = getDb();
  const safeQuery = q.replace(/\"/g, '');
  const params: { query: string; categoryId?: number; limit: number; offset: number } = {
    query: safeQuery,
    limit,
    offset
  };

  const where = Number.isFinite(categoryId) ? ' AND b.category_id = @categoryId ' : '';
  if (Number.isFinite(categoryId)) {
    params.categoryId = categoryId;
  }

  const results = client
    .prepare(
      `SELECT
        b.id,
        b.url,
        b.title,
        b.description,
        b.og_image,
        b.favicon,
        b.domain,
        b.status,
        b.created_at,
        bm25(bookmarks_fts) AS rank
       FROM bookmarks_fts
       JOIN bookmarks b ON b.id = bookmarks_fts.rowid
       WHERE bookmarks_fts MATCH @query${where}
       ORDER BY rank
       LIMIT @limit OFFSET @offset`
    )
    .all(params) as Array<Record<string, unknown>>;

  const items = results.map((row) => ({
    id: Number(row.id),
    url: String(row.url),
    title: row.title ? String(row.title) : null,
    description: row.description ? String(row.description) : null,
    ogImage: row.og_image ? String(row.og_image) : null,
    favicon: row.favicon ? String(row.favicon) : null,
    domain: row.domain ? String(row.domain) : null,
    status: String(row.status),
    createdAt: String(row.created_at),
    score: Number(row.rank)
  }));

  const total =
    (client
      .prepare(`
        SELECT COUNT(*) AS total
        FROM bookmarks_fts
        JOIN bookmarks b ON b.id = bookmarks_fts.rowid
        WHERE bookmarks_fts MATCH @query${where}
      `)
      .get(params) as { total: number }) || { total: 0 };

  return {
    items,
    total: Number(total.total),
    q,
    page,
    limit
  };
});
