import { defineEventHandler, getRouterParam } from 'h3';
import { getDb } from '../../../utils/db';
import { enqueueJob } from '../../../utils/queue';
import { getValidatedId } from '../../../utils/validation';

export default defineEventHandler((event) => {
  const id = getValidatedId(event);
  if (!id) {
    return { statusCode: 400, message: 'Invalid bookmark id' };
  }

  const { client } = getDb();
  const bookmark = client
    .prepare('SELECT id, url FROM bookmarks WHERE id = ? LIMIT 1')
    .get(id) as { id: number; url: string } | undefined;

  if (!bookmark) {
    return { statusCode: 404, message: 'Bookmark not found' };
  }

  // Reset bookmark to re-fetch and re-process
  client
    .prepare(
      `UPDATE bookmarks 
       SET status = 'pending',
           ai_status = 'pending',
           source_metadata = NULL,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`
    )
    .run(id);

  // Remove old tags (they'll be re-generated)
  client.prepare('DELETE FROM tags WHERE bookmark_id = ?').run(id);

  // Re-enqueue all jobs
  enqueueJob('fetch', id, { url: bookmark.url });
  enqueueJob('normalize', id);
  enqueueJob('classify', id);
  enqueueJob('summarize', id);
  enqueueJob('embed', id);

  return {
    id,
    status: 'queued',
    message: 'Bookmark queued for full re-processing (fetch + AI)'
  };
});
