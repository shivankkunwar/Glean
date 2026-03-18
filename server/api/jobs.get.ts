import { defineEventHandler, getQuery } from 'h3';
import { getDb } from '../utils/db';

type JobRow = {
  id: number;
  type: 'fetch' | 'normalize' | 'classify' | 'summarize' | 'embed' | 'reindex';
  bookmark_id: number;
  status: 'pending' | 'processing' | 'done' | 'failed';
  payload: string | null;
  attempts: number;
  error: string | null;
  next_run_at: string;
  created_at: string;
  bookmark_url: string | null;
  bookmark_title: string | null;
};

function safeParse(payload: string | null) {
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(payload);
  } catch {
    return { raw: payload };
  }
}

export default defineEventHandler((event) => {
  const query = getQuery(event);
  const page = Number(query.page ?? 1);
  const limit = Math.min(Number(query.limit ?? 50), 100);
  const offset = (Math.max(page, 1) - 1) * limit;

  const status = typeof query.status === 'string' && query.status.length > 0 ? query.status : null;
  const bookmarkId = Number(query.bookmarkId ?? NaN);
  const type = typeof query.type === 'string' && query.type.length > 0 ? query.type : null;

  const { client } = getDb();

  const where: string[] = [];
  const params: Record<string, string | number> = { limit, offset };

  if (status) {
    where.push('j.status = @status');
    params.status = status;
  }

  if (Number.isFinite(bookmarkId)) {
    where.push('j.bookmark_id = @bookmarkId');
    params.bookmarkId = bookmarkId;
  }

  if (type) {
    where.push('j.type = @type');
    params.type = type;
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = client
    .prepare(
      `SELECT
        j.id,
        j.type,
        j.bookmark_id,
        j.status,
        j.payload,
        j.attempts,
        j.error,
        j.next_run_at,
        j.created_at,
        b.url AS bookmark_url,
        b.title AS bookmark_title
      FROM jobs j
      LEFT JOIN bookmarks b ON b.id = j.bookmark_id
      ${whereClause}
      ORDER BY j.id DESC
      LIMIT @limit OFFSET @offset`
    )
    .all(params) as JobRow[];

  const totalRow =
    (client
      .prepare(`SELECT COUNT(*) AS count FROM jobs j ${whereClause}`)
      .get(params) as { count: number }) ?? { count: 0 };

  return {
    items: rows.map((row) => ({
      id: row.id,
      type: row.type,
      bookmarkId: row.bookmark_id,
      status: row.status,
      attempts: row.attempts,
      error: row.error,
      nextRunAt: row.next_run_at,
      createdAt: row.created_at,
      payload: safeParse(row.payload),
      bookmark: row.bookmark_id
        ? {
            id: row.bookmark_id,
            url: row.bookmark_url,
            title: row.bookmark_title
          }
        : null
    })),
    total: Number(totalRow.count),
    page,
    limit
  };
});
