import { defineEventHandler, getRouterParam } from 'h3';
import { getDb } from '../../utils/db';
import { getValidatedId } from '../../utils/validation';

export default defineEventHandler((event) => {
  const id = getValidatedId(event);
  if (!id) {
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

  const artifacts = client
    .prepare('SELECT id, kind, value_json, provider, model, version, confidence, skipped, reason, created_at FROM bookmark_ai_artifacts WHERE bookmark_id = @id ORDER BY id DESC')
    .all({ id }) as Array<{ id: number; kind: string; value_json: string; provider: string; model: string; version: string; confidence: number; skipped: number; reason: string | null; created_at: string }>;

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
    tags,
    aiStatus: bookmark.ai_status,
    summary: bookmark.summary,
    aiArtifacts: artifacts.map((a) => ({
      id: a.id,
      kind: a.kind,
      value: JSON.parse(a.value_json ?? '{}'),
      provider: a.provider,
      model: a.model,
      version: a.version,
      confidence: a.confidence,
      skipped: Boolean(a.skipped),
      reason: a.reason,
      createdAt: a.created_at
    }))
  };
});
