import { getDb } from './db';
import { serializeVector, deserializeVector, cosineSimilarity, type Vector } from './vectors';
import { noopProvider } from './ai/noop';
import { createGeminiProvider } from './ai/gemini';

export async function saveEmbedding(
  bookmarkId: number,
  vector: Vector,
  model: string,
  version: string
): Promise<void> {
  const { client } = getDb();
  const blob = serializeVector(vector);

  client
    .prepare(
      `INSERT OR REPLACE INTO bookmark_embeddings
       (bookmark_id, embedding_version, model, dimension_count, vector_blob, created_at)
       VALUES (@bookmarkId, @version, @model, @dimension, @blob, CURRENT_TIMESTAMP)`
    )
    .run({
      bookmarkId,
      version,
      model,
      dimension: vector.length,
      blob
    });
}

export function getAllEmbeddings(): Array<{ bookmarkId: number; vector: Vector }> {
  const { client } = getDb();
  const rows = client
    .prepare('SELECT bookmark_id, vector_blob FROM bookmark_embeddings')
    .all() as Array<{ bookmark_id: number; vector_blob: Buffer }>;

  return rows.map((row) => ({
    bookmarkId: row.bookmark_id,
    vector: deserializeVector(row.vector_blob)
  }));
}

export function findNearestNeighbors(
  queryVector: Vector,
  k: number = 30,
  minScore: number = 0.7
): Array<{ bookmarkId: number; score: number }> {
  const allEmbeddings = getAllEmbeddings();
  const scored = allEmbeddings
    .map((item) => ({
      bookmarkId: item.bookmarkId,
      score: cosineSimilarity(queryVector, item.vector)
    }))
    .filter((item) => item.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  return scored;
}


