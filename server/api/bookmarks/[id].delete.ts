import { defineEventHandler, getRouterParam } from 'h3';
import { getDb } from '../../utils/db';
import { getValidatedId } from '../../utils/validation';

export default defineEventHandler((event) => {
  const id = getValidatedId(event);
  if (!id) {
    return { statusCode: 400, message: 'Invalid bookmark id' };
  }

  const { client } = getDb();
  const result = client.prepare('DELETE FROM bookmarks WHERE id = @id').run({ id });

  if (!result.changes) {
    return { statusCode: 404, message: 'Bookmark not found' };
  }

  return { ok: true };
});
