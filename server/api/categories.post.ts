import { defineEventHandler, readBody } from 'h3';
import { getDb } from '../utils/db';

export default defineEventHandler(async (event) => {
  const body = await readBody<{ name?: string; color?: string; icon?: string }>(event);
  const name = body?.name?.trim() || '';
  if (!name) {
    return { statusCode: 400, message: 'Missing category name' };
  }

  const color = body?.color?.trim() || '#dbeafe';
  const icon = body?.icon?.trim() || '🗂';

  const { client } = getDb();
  const result = client
    .prepare('INSERT OR IGNORE INTO categories (name, color, icon, created_at) VALUES (@name, @color, @icon, CURRENT_TIMESTAMP)')
    .run({ name, color, icon });

  if (!result.changes) {
    return { statusCode: 409, message: 'Category already exists' };
  }

  const row = client.prepare('SELECT id, name, color, icon, created_at FROM categories WHERE name = @name').get({ name });
  return row;
});
