import { defineEventHandler, getQuery } from 'h3';
import { getDb } from '../../utils/db';

export default defineEventHandler((event) => {
  const query = getQuery(event);
  const { client } = getDb();

  // Overall stats
  const stats = client.prepare(`
    SELECT 
      COUNT(*) as total_bookmarks,
      SUM(CASE WHEN ai_status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN ai_status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN ai_status = 'done' THEN 1 ELSE 0 END) as done,
      SUM(CASE WHEN ai_status = 'skipped' THEN 1 ELSE 0 END) as skipped,
      SUM(CASE WHEN ai_status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN summary IS NOT NULL AND summary != '' THEN 1 ELSE 0 END) as has_summary,
      SUM(CASE WHEN canonical_text IS NOT NULL THEN 1 ELSE 0 END) as has_canonical
    FROM bookmarks
  `).get() as {
    total_bookmarks: number;
    pending: number;
    in_progress: number;
    done: number;
    skipped: number;
    failed: number;
    has_summary: number;
    has_canonical: number;
  };

  // Job queue stats
  const jobStats = client.prepare(`
    SELECT 
      type,
      status,
      COUNT(*) as count
    FROM jobs
    GROUP BY type, status
    ORDER BY type, status
  `).all() as Array<{ type: string; status: string; count: number }>;

  // Recent AI artifacts (last 20)
  const recentArtifacts = client.prepare(`
    SELECT 
      a.id,
      a.bookmark_id,
      a.kind,
      a.provider,
      a.model,
      a.skipped,
      a.reason,
      a.created_at,
      b.title as bookmark_title,
      b.url as bookmark_url
    FROM bookmark_ai_artifacts a
    LEFT JOIN bookmarks b ON b.id = a.bookmark_id
    ORDER BY a.created_at DESC
    LIMIT 20
  `).all() as Array<{
    id: number;
    bookmark_id: number;
    kind: string;
    provider: string;
    model: string;
    skipped: number;
    reason: string | null;
    created_at: string;
    bookmark_title: string | null;
    bookmark_url: string | null;
  }>;

  // Failed jobs with errors
  const failedJobs = client.prepare(`
    SELECT 
      j.id,
      j.type,
      j.bookmark_id,
      j.error,
      j.attempts,
      j.created_at,
      b.title as bookmark_title,
      b.url as bookmark_url
    FROM jobs j
    LEFT JOIN bookmarks b ON b.id = j.bookmark_id
    WHERE j.status = 'failed'
    ORDER BY j.created_at DESC
    LIMIT 10
  `).all() as Array<{
    id: number;
    type: string;
    bookmark_id: number;
    error: string | null;
    attempts: number;
    created_at: string;
    bookmark_title: string | null;
    bookmark_url: string | null;
  }>;

  return {
    stats: {
      totalBookmarks: stats.total_bookmarks,
      aiStatus: {
        pending: stats.pending,
        inProgress: stats.in_progress,
        done: stats.done,
        skipped: stats.skipped,
        failed: stats.failed
      },
      enrichment: {
        hasSummary: stats.has_summary,
        hasCanonical: stats.has_canonical
      }
    },
    jobQueue: jobStats.reduce((acc, row) => {
      if (!acc[row.type]) acc[row.type] = {};
      acc[row.type][row.status] = row.count;
      return acc;
    }, {} as Record<string, Record<string, number>>),
    recentArtifacts: recentArtifacts.map(a => ({
      id: a.id,
      bookmarkId: a.bookmark_id,
      kind: a.kind,
      provider: a.provider,
      model: a.model,
      skipped: Boolean(a.skipped),
      reason: a.reason,
      createdAt: a.created_at,
      bookmark: a.bookmark_id ? {
        id: a.bookmark_id,
        title: a.bookmark_title,
        url: a.bookmark_url
      } : null
    })),
    failedJobs: failedJobs.map(j => ({
      id: j.id,
      type: j.type,
      bookmarkId: j.bookmark_id,
      error: j.error,
      attempts: j.attempts,
      createdAt: j.created_at,
      bookmark: j.bookmark_id ? {
        id: j.bookmark_id,
        title: j.bookmark_title,
        url: j.bookmark_url
      } : null
    })),
    summary: {
      healthy: stats.failed === 0 && (jobStats.find(j => j.status === 'failed')?.count || 0) === 0,
      message: stats.failed > 0 
        ? `${stats.failed} bookmarks have failed AI processing`
        : (stats.pending > 0 || stats.in_progress > 0)
        ? `Processing: ${stats.pending} pending, ${stats.in_progress} in progress`
        : 'All bookmarks processed'
    }
  };
});
