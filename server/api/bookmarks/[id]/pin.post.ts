import { getDb } from '../../../utils/db';

export default defineEventHandler(async (event) => {
  const bookmarkId = Number(event.context.params?.id);

  if (!bookmarkId || isNaN(bookmarkId)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid bookmark ID'
    });
  }

  const { client } = getDb();

  const bookmark = client
    .prepare('SELECT id, is_pinned FROM bookmarks WHERE id = ?')
    .get(bookmarkId) as { id: number; is_pinned: number } | undefined;

  if (!bookmark) {
    throw createError({
      statusCode: 404,
      message: 'Bookmark not found'
    });
  }

  const newPinStatus = bookmark.is_pinned ? 0 : 1;
  
  client
    .prepare('UPDATE bookmarks SET is_pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(newPinStatus, bookmarkId);

  return {
    id: bookmarkId,
    isPinned: newPinStatus === 1,
    message: newPinStatus ? 'Bookmark pinned' : 'Bookmark unpinned'
  };
});