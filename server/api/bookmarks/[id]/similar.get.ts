import { getDb } from '../../../utils/db';
import { findNearestNeighbors } from '../../../utils/embeddings';
import { deserializeVector } from '../../../utils/vectors';
import { getBookmarkById } from '../../../utils/ingest';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const bookmarkId = Number(query.bookmarkId);
  const limit = Math.min(Number(query.limit) || 5, 20);
  const minScore = Number(query.minScore) || 0.7;

  if (!bookmarkId || isNaN(bookmarkId)) {
    throw createError({
      statusCode: 400,
      message: 'bookmarkId is required'
    });
  }

  const { client } = getDb();

  const bookmarkRow = client
    .prepare('SELECT id FROM bookmarks WHERE id = ?')
    .get(bookmarkId) as { id: number } | undefined;

  if (!bookmarkRow) {
    throw createError({
      statusCode: 404,
      message: 'Bookmark not found'
    });
  }

  const embeddingRow = client
    .prepare('SELECT vector_blob FROM bookmark_embeddings WHERE bookmark_id = ?')
    .get(bookmarkId) as { vector_blob: Buffer } | undefined;

  if (!embeddingRow) {
    return {
      items: [],
      message: 'No embedding found for this bookmark'
    };
  }

  const queryVector = deserializeVector(embeddingRow.vector_blob);
  const neighbors = findNearestNeighbors(queryVector, limit + 1, minScore);

  const similarIds = neighbors
    .filter(n => n.bookmarkId !== bookmarkId)
    .slice(0, limit);

  if (similarIds.length === 0) {
    return {
      items: [],
      total: 0
    };
  }

  const placeholders = similarIds.map(() => '?').join(',');
  const ids = similarIds.map(n => n.bookmarkId);

  const rows = client
    .prepare(
      `SELECT
        b.id,
        b.url,
        b.title,
        b.description,
        b.og_image,
        b.favicon,
        b.domain,
        b.status,
        b.created_at,
        b.source_type
       FROM bookmarks b
       WHERE b.id IN (${placeholders})
       ORDER BY b.created_at DESC`
    )
    .all(...ids) as Array<Record<string, unknown>>;

  const items = rows.map((row) => {
    const similar = similarIds.find(n => n.bookmarkId === row.id);
    return {
      id: Number(row.id),
      url: String(row.url),
      title: row.title ? String(row.title) : null,
      description: row.description ? String(row.description) : null,
      ogImage: row.og_image ? String(row.og_image) : null,
      favicon: row.favicon ? String(row.favicon) : null,
      domain: row.domain ? String(row.domain) : null,
      status: String(row.status),
      createdAt: String(row.created_at),
      sourceType: String(row.source_type),
      similarity: similar?.score ?? 0
    };
  });

  return {
    items,
    total: items.length
  };
});