import { defineEventHandler, getRouterParam } from 'h3';
import { getDb } from '../../utils/db';
import { getValidatedId } from '../../utils/validation';

export default defineEventHandler((event) => {
  const id = getValidatedId(event);
  if (!id) {
    return { statusCode: 400, message: 'Invalid category id' };
  }

  const { client } = getDb();
  const bookmarkUpdate = client.prepare('UPDATE bookmarks SET category_id = NULL WHERE category_id = @id').run({ id });
  const result = client.prepare('DELETE FROM categories WHERE id = @id').run({ id });

  if (!result.changes) {
    return { statusCode: 404, message: 'Category not found' };
  }

  return { ok: true, detachedBookmarks: bookmarkUpdate.changes };
});
