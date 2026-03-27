import { defineEventHandler } from 'h3';
import { getDb } from '../utils/db';

// Returns up to 5 recent, displayable bookmarks for the splash screen.
// Prefers processed bookmarks with real titles over unprocessed stubs.
export default defineEventHandler(() => {
  const { client } = getDb();

  const rows = client.prepare(`
    SELECT
      b.id,
      b.title,
      b.domain,
      b.source_type,
      b.favicon,
      b.created_at,
      b.status,
      c.name  AS category_name,
      c.color AS category_color
    FROM bookmarks b
    LEFT JOIN categories c ON c.id = b.category_id
    WHERE b.title IS NOT NULL
      AND b.title != ''
      AND b.url NOT LIKE 'https://note.local/%'
    ORDER BY b.created_at DESC
    LIMIT 6
  `).all() as Array<{
    id: number;
    title: string;
    domain: string | null;
    source_type: string | null;
    favicon: string | null;
    created_at: string;
    status: string;
    category_name: string | null;
    category_color: string | null;
  }>;

  // Map source_type to a card theme palette key
  const paletteForType = (st: string | null, idx: number): string => {
    if (st === 'youtube') return 'terra';
    if (st === 'twitter' || st === 'x') return 'slate';
    if (st === 'github') return 'pine';
    const cycle = ['amber', 'sage', 'terra', 'slate', 'sand', 'pine'];
    return cycle[idx % cycle.length]!;
  };

  const typeLabel = (st: string | null): string => {
    if (st === 'youtube') return 'Video';
    if (st === 'twitter' || st === 'x') return 'Tweet';
    if (st === 'github') return 'Repo';
    if (st === 'book') return 'Book';
    if (st === 'product') return 'Product';
    return 'Article';
  };

  // Relative time helper
  const relativeTime = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${Math.max(1, m)}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric' });
  };

  return rows.slice(0, 5).map((row, idx) => ({
    id: row.id,
    title: row.title,
    domain: row.domain ?? '',
    palette: paletteForType(row.source_type, idx),
    typeLabel: typeLabel(row.source_type),
    savedAt: relativeTime(row.created_at),
    favicon: row.favicon,
    categoryName: row.category_name,
  }));
});
