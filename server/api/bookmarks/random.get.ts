import { getDb } from '../../utils/db';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const limit = Math.min(Number(query.limit) || 3, 10);
  const excludeIds = query.exclude 
    ? String(query.exclude).split(',').map(Number).filter(n => !isNaN(n))
    : [];

  const { client } = getDb();

  let sql = `
    SELECT
      b.id,
      b.url,
      b.title,
      b.description,
      b.og_image,
      b.favicon,
      b.domain,
      b.status,
      b.created_at,
      b.source_type,
      RANDOM() as random_score
    FROM bookmarks b
    WHERE b.status = 'done'
  `;

  const params: unknown[] = [];
  
  if (excludeIds.length > 0) {
    const placeholders = excludeIds.map(() => '?').join(',');
    sql += ` AND b.id NOT IN (${placeholders})`;
    params.push(...excludeIds);
  }

  sql += `
    ORDER BY random_score
    LIMIT ?
  `;
  params.push(limit);

  const rows = client
    .prepare(sql)
    .all(...params) as Array<Record<string, unknown>>;

  const items = rows.map((row) => ({
    id: Number(row.id),
    url: String(row.url),
    title: row.title ? String(row.title) : null,
    description: row.description ? String(row.description) : null,
    ogImage: row.og_image ? String(row.og_image) : null,
    favicon: row.favicon ? String(row.favicon) : null,
    domain: row.domain ? String(row.domain) : null,
    status: String(row.status),
    createdAt: String(row.created_at),
    sourceType: String(row.source_type)
  }));

  return {
    items,
    total: items.length,
    message: 'Rediscover forgotten bookmarks'
  };
});