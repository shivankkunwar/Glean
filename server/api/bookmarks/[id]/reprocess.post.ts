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

  // Check if this is a note (has note.local URL)
  const isNote = bookmark.url.startsWith('https://note.local/');

  // Reset bookmark to re-fetch and re-process
  // For notes, preserve the description field to keep the note text
  client
    .prepare(
      `UPDATE bookmarks 
       SET status = 'pending',
           ai_status = 'pending',
           source_metadata = NULL,
           description = CASE WHEN ? THEN description ELSE NULL END,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`
    )
    .run(isNote ? 1 : 0, id);

  // Remove old tags (they'll be re-generated)
  client.prepare('DELETE FROM tags WHERE bookmark_id = ?').run(id);

  // Re-enqueue jobs (skip fetch for notes to preserve text)
  if (!isNote) {
    enqueueJob('fetch', id, { url: bookmark.url });
  }
  enqueueJob('normalize', id);
  enqueueJob('classify', id);
  enqueueJob('summarize', id);
  enqueueJob('embed', id);

  return {
    id,
    status: 'queued',
    message: 'Bookmark queued for re-processing' + (isNote ? ' (preserving note text)' : ' (fetch + AI)')
  };
});
