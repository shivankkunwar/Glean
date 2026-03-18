import { defineEventHandler, readBody } from 'h3';
import { getDb } from '../utils/db';

export default defineEventHandler(async (event) => {
  const body = await readBody<{ bookmarkId?: number; name?: string }>(event);
  const bookmarkId = Number(body?.bookmarkId);
  const name = body?.name?.trim().toLowerCase() || '';

  if (!Number.isFinite(bookmarkId) || !name) {
    return { statusCode: 400, message: 'bookmarkId and name are required' };
  }

  const { client } = getDb();
  const exists = client.prepare('SELECT id FROM bookmarks WHERE id = @bookmarkId').get({ bookmarkId });
  if (!exists) {
    return { statusCode: 404, message: 'Bookmark not found' };
  }

  const result = client
    .prepare(
      `INSERT INTO tags (bookmark_id, name, source, confidence)
       VALUES (@bookmarkId, @name, 'manual', 1)
       ON CONFLICT(bookmark_id, name) DO NOTHING`
    )
    .run({ bookmarkId, name });

  if (!result.changes) {
    return { statusCode: 409, message: 'Tag already exists' };
  }

  return { ok: true, bookmarkId, name };
});