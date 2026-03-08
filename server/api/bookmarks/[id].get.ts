import { defineEventHandler, getRouterParam } from 'h3';
import { getDb } from '../../utils/db';

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'id'));
  if (!Number.isFinite(id)) {
    return { statusCode: 400, message: 'Invalid bookmark id' };
  }

  const { client } = getDb();
  const bookmark = client
    .prepare(
      `SELECT
        b.*, c.id as category_id, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM bookmarks b
      LEFT JOIN categories c ON c.id = b.category_id
      WHERE b.id = @id`
    )
    .get({ id }) as any;

  if (!bookmark) {
    return { statusCode: 404, message: 'Bookmark not found' };
  }

  const tags = client
    .prepare('SELECT id, name, source, confidence FROM tags WHERE bookmark_id = @id ORDER BY id DESC')
    .all({ id }) as Array<{ id: number; name: string; source: string; confidence: number }>;

  return {
    ...bookmark,
    category: bookmark.category_name
      ? {
          id: bookmark.category_id,
          name: bookmark.category_name,
          color: bookmark.category_color,
          icon: bookmark.category_icon
        }
      : null,
    tags
  };
});
