import { defineEventHandler, getQuery } from 'h3';
import { getDb } from '../utils/db';
import { getValidatedPage, getValidatedLimit, getValidatedCategoryId } from '../utils/validation';
import { MAX_PAGE_LIMIT } from '../utils/constants';
import { buildSourceTypePredicate, getValidatedSourceType } from '../utils/source-type';

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
  source_metadata: string | null;
  status: string;
  ai_status: string | null;
  summary: string | null;
  category_id: number | null;
  category_name: string | null;
  category_color: string | null;
  category_icon: string | null;
  created_at: string;
  updated_at: string;
  is_pinned: number;
};
export default defineEventHandler((event) => {
  const { db, client } = getDb();
  const query = getQuery(event);

  const page = getValidatedPage(query);
  const limit = getValidatedLimit(query, MAX_PAGE_LIMIT);
  const offset = (page - 1) * limit;
  const categoryId = getValidatedCategoryId(query);
  const sourceType = getValidatedSourceType(query);

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
      b.source_metadata,
      b.status,
      b.ai_status,
      b.summary,
      b.category_id,
      c.name AS category_name,
      c.color AS category_color,
      c.icon AS category_icon,
      b.created_at,
      b.updated_at,
      b.is_pinned
    FROM bookmarks b
    LEFT JOIN categories c ON c.id = b.category_id
  `;

  const pinnedOnly = query.pinned === 'true';
  const conditions: string[] = [];
  if (categoryId) conditions.push('b.category_id = @categoryId');
  if (sourceType) conditions.push(buildSourceTypePredicate(sourceType, 'b'));
  if (pinnedOnly) conditions.push('b.is_pinned = 1');
  const filter = conditions.length ? ` WHERE ${conditions.join(' AND ')} ` : '';

  const rows = client
    .prepare(`${baseSelect}${filter} ORDER BY b.is_pinned DESC, b.created_at DESC LIMIT @limit OFFSET @offset`)
    .all({ categoryId, limit, offset }) as Row[];

  const totalRow =
    (client
      .prepare(`SELECT COUNT(*) AS count FROM bookmarks b${filter}`)
      .get({ categoryId }) as { count: number }) ?? { count: 0 };

  // Scope tags to only the bookmarks we loaded — avoids a full table scan at scale
  const loadedIds = rows.map((r) => r.id);
  const tagRows = loadedIds.length
    ? (client
        .prepare(
          `SELECT id, bookmark_id, name, source, confidence FROM tags WHERE bookmark_id IN (${loadedIds.map(() => '?').join(',')}) ORDER BY id DESC`
        )
        .all(...loadedIds) as Array<{ id: number; bookmark_id: number; name: string; source: string; confidence: number }>)
    : [];

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
    sourceMetadata: row.source_metadata,
    status: row.status,
    aiStatus: row.ai_status,
    summary: row.summary,
    categoryId: row.category_id,
    isPinned: row.is_pinned === 1,
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
