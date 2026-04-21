import { getDb } from '../../utils/db';
import type { CuratedBookmark } from '../../../app/types/curated';

function toCuratedBookmark(row: Record<string, unknown>): CuratedBookmark {
  return {
    id: Number(row.id),
    url: String(row.url),
    title: row.title ? String(row.title) : null,
    description: row.description ? String(row.description) : null,
    summary: row.summary ? String(row.summary) : null,
    ogImage: row.og_image ? String(row.og_image) : null,
    favicon: row.favicon ? String(row.favicon) : null,
    domain: row.domain ? String(row.domain) : null,
    sourceType: row.source_type ? String(row.source_type) : null,
    createdAt: String(row.created_at),
    isPinned: row.is_pinned === 1,
  };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = a[i]!;
    a[i] = a[j]!;
    a[j] = temp;
  }
  return a;
}

export default defineEventHandler(async (_event) => {
  const { client } = getDb();

  const olderRows = client
    .prepare(`
      SELECT id, url, title, description, summary,
        og_image, favicon, domain, source_type, created_at, is_pinned
      FROM bookmarks WHERE status = 'done' AND is_pinned = 0
      ORDER BY created_at ASC LIMIT 60
    `)
    .all() as Array<Record<string, unknown>>;

  const ids = olderRows.map((r) => Number(r.id));
  const tagRows = ids.length
    ? (client
        .prepare(`SELECT id, bookmark_id, name FROM tags WHERE bookmark_id IN (${ids.join(',')})`)
        .all() as Array<{ id: number; bookmark_id: number; name: string }>)
    : [];

  const tagMap = new Map<number, Array<{ id: number; name: string }>>();
  for (const t of tagRows) {
    const list = tagMap.get(t.bookmark_id) || [];
    list.push({ id: t.id, name: t.name });
    tagMap.set(t.bookmark_id, list);
  }

  return shuffle(olderRows)
    .slice(0, 3)
    .map((row) => ({
      ...toCuratedBookmark(row),
      tags: tagMap.get(Number(row.id)) || [],
    }));
});
