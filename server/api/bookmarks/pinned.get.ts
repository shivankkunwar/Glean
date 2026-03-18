import { getDb } from '../../utils/db';

export default defineEventHandler(async (event) => {
  const { client } = getDb();

  const rows = client
    .prepare(`
      SELECT
        b.id,
        b.url,
        b.title,
        b.description,
        b.og_image,
        b.favicon,
        b.domain,
        b.source_type,
        b.status,
        b.ai_status,
        b.summary,
        b.category_id,
        c.name AS category_name,
        c.color AS category_color,
        c.icon AS category_icon,
        b.created_at,
        b.updated_at
      FROM bookmarks b
      LEFT JOIN categories c ON c.id = b.category_id
      WHERE b.is_pinned = 1
      ORDER BY b.updated_at DESC
    `)
    .all() as Array<Record<string, unknown>>;

  const tagRows = client
    .prepare('SELECT id, bookmark_id, name, source, confidence FROM tags ORDER BY id DESC')
    .all() as Array<{ id: number; bookmark_id: number; name: string; source: string; confidence: number }>;

  const tagMap = new Map<number, Array<{ id: number; name: string; source: string; confidence: number }>>();
  for (const tag of tagRows) {
    const current = tagMap.get(tag.bookmark_id) || [];
    current.push({ id: tag.id, name: tag.name, source: tag.source, confidence: tag.confidence });
    tagMap.set(tag.bookmark_id, current);
  }

  const items = rows.map((row) => ({
    id: Number(row.id),
    url: String(row.url),
    title: row.title ? String(row.title) : null,
    description: row.description ? String(row.description) : null,
    ogImage: row.og_image ? String(row.og_image) : null,
    favicon: row.favicon ? String(row.favicon) : null,
    domain: row.domain ? String(row.domain) : null,
    sourceType: row.source_type ? String(row.source_type) : null,
    status: String(row.status),
    aiStatus: row.ai_status ? String(row.ai_status) : null,
    summary: row.summary ? String(row.summary) : null,
    categoryId: row.category_id ? Number(row.category_id) : null,
    isPinned: true,
    category: row.category_name
      ? {
          id: Number(row.category_id),
          name: String(row.category_name),
          color: String(row.category_color),
          icon: String(row.category_icon)
        }
      : null,
    tags: tagMap.get(Number(row.id)) || [],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  }));

  return {
    items,
    total: items.length
  };
});