import { defineEventHandler, getQuery } from 'h3';
import { getDb } from '../utils/db';

export default defineEventHandler((event) => {
  const query = getQuery(event);
  const bookmarkId = query.bookmarkId ? Number(query.bookmarkId) : undefined;

  const { client } = getDb();
  const rows = bookmarkId
    ? client
        .prepare('SELECT id, bookmark_id, name, source, confidence FROM tags WHERE bookmark_id = @bookmarkId ORDER BY id DESC')
        .all({ bookmarkId })
    : client.prepare('SELECT id, bookmark_id, name, source, confidence FROM tags ORDER BY created_at DESC').all();

  return rows;
});
