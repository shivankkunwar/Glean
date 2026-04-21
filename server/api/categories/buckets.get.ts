import { defineEventHandler } from 'h3';
import { getDb } from '../../utils/db';

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

export default defineEventHandler(() => {
  const { client } = getDb();

  // 1. Get categories that have at least one bookmark
  const categories = client.prepare(`
    SELECT c.id, c.name, c.color, c.icon, COUNT(b.id) as count
    FROM categories c
    JOIN bookmarks b ON b.category_id = c.id
    GROUP BY c.id
    ORDER BY c.name ASC
  `).all() as Array<{ id: number; name: string; color: string; icon: string; count: number }>;

  // 2. For each category, get the top 8 latest bookmarks
  const buckets = categories.map(cat => {
    const rows = client.prepare(`
      SELECT b.id, b.url, b.title, b.description, b.content, b.og_image, b.favicon, b.domain, b.source_type, b.source_metadata, b.status, b.ai_status, b.summary, b.category_id, b.created_at, b.updated_at, b.is_pinned
      FROM bookmarks b
      WHERE b.category_id = ?
      ORDER BY b.created_at DESC
      LIMIT 8
    `).all(cat.id) as Row[];

    // Load tags for these specific items
    const loadedIds = rows.map((r) => r.id);
    let tagMap = new Map<number, Array<{ id: number; name: string; source: string; confidence: number }>>();
    if (loadedIds.length > 0) {
      const tagRows = client.prepare(
        `SELECT id, bookmark_id, name, source, confidence FROM tags WHERE bookmark_id IN (${loadedIds.map(() => '?').join(',')}) ORDER BY id DESC`
      ).all(...loadedIds) as Array<{ id: number; bookmark_id: number; name: string; source: string; confidence: number }>;

      for (const tag of tagRows) {
        const current = tagMap.get(tag.bookmark_id) || [];
        current.push({ id: tag.id, name: tag.name, source: tag.source, confidence: tag.confidence });
        tagMap.set(tag.bookmark_id, current);
      }
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
      category: {
        id: cat.id,
        name: cat.name,
        color: cat.color,
        icon: cat.icon
      },
      tags: tagMap.get(row.id) || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return { ...cat, items };
  });

  return buckets;
});
