import { defineEventHandler } from 'h3';
import { getDb } from '../utils/db';

export default defineEventHandler(() => {
  const { client } = getDb();
  const rows = client
    .prepare(
      `SELECT
        c.id,
        c.name,
        c.color,
        c.icon,
        c.created_at,
        COALESCE((SELECT COUNT(*) FROM bookmarks b WHERE b.category_id = c.id), 0) AS count
      FROM categories c
      ORDER BY c.name ASC`
    )
    .all() as Array<{ id: number; name: string; color: string; icon: string; created_at: string; count: number }>;

  return rows;
});
