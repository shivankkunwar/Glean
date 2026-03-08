import { defineEventHandler, getRouterParam } from 'h3';
import { getDb } from '../../../../utils/db';

export default defineEventHandler((event) => {
  const bookmarkId = Number(getRouterParam(event, 'id'));
  const tagId = Number(getRouterParam(event, 'tagId'));

  if (!Number.isFinite(bookmarkId) || !Number.isFinite(tagId)) {
    return { statusCode: 400, message: 'Invalid ids' };
  }

  const { client } = getDb();
  const result = client
    .prepare('DELETE FROM tags WHERE id = @tagId AND bookmark_id = @bookmarkId')
    .run({ tagId, bookmarkId });

  if (!result.changes) {
    return { statusCode: 404, message: 'Tag not found' };
  }

  return { ok: true };
});
