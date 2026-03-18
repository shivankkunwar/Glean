import { defineEventHandler, getQuery } from 'h3';
import { getDb } from '../utils/db';
import { getValidatedPage, getValidatedLimit, getValidatedCategoryId } from '../utils/validation';
import { MAX_PAGE_LIMIT } from '../utils/constants';

type Row = {
  id: number;
  url: string;
  title: string | null;
  description: string | null;
  content: string | null;
  og_image: string | null;
  favicon: string | null;
  domain: string | null;
  source_type: string | null;
  status: string;
  ai_status: string | null;
  summary: string | null;
  category_id: number | null;
  category_name: string | null;
  category_color: string | null;
  category_icon: string | null;
  created_at: string;
  updated_at: string;
};
export default defineEventHandler((event) => {
  const { db, client } = getDb();
  const query = getQuery(event);

  const page = getValidatedPage(query);
  const limit = getValidatedLimit(query, MAX_PAGE_LIMIT);
  const offset = (page - 1) * limit;
  const categoryId = getValidatedCategoryId(query);

  const baseSelect = `
    SELECT
      b.id,
      b.url,
      b.title,
      b.description,
      b.content,
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
  `;

  const filter = categoryId ? ' WHERE b.category_id = @categoryId ' : '';
  const rows = client
    .prepare(`${baseSelect}${filter} ORDER BY b.created_at DESC LIMIT @limit OFFSET @offset`)
    .all({ categoryId, limit, offset }) as Row[];

  const totalRow =
    (client
      .prepare(`SELECT COUNT(*) AS count FROM bookmarks b${filter}`)
      .get({ categoryId }) as { count: number }) ?? { count: 0 };

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
    id: row.id,
    url: row.url,
    title: row.title,
    description: row.description,
    content: row.content,
    ogImage: row.og_image,
    favicon: row.favicon,
    domain: row.domain,
    sourceType: row.source_type,
    status: row.status,
    aiStatus: row.ai_status,
    summary: row.summary,
    categoryId: row.category_id,
    category: row.category_name
      ? {
          id: row.category_id,
          name: row.category_name,
          color: row.category_color,
          icon: row.category_icon
        }
      : null,
    tags: tagMap.get(row.id) || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));

  return {
    items,
    total: totalRow.count,
    page,
    limit
  };
});
