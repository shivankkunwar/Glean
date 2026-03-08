import PQueue from 'p-queue';
import { getDb } from './db';
import { getBookmarkMetadata } from './extract';

export type JobType = 'fetch' | 'embed' | 'classify';

type JobRow = {
  id: number;
  type: JobType;
  bookmark_id: number;
  status: 'pending' | 'processing' | 'done' | 'failed';
  payload: string | null;
  attempts: number;
  error: string | null;
  next_run_at: string;
};

type JobPayload = {
  url: string;
};

const queue = new PQueue({ concurrency: 1 });
const retryBackoffMs = [15000, 45000, 120000];
let started = false;

export function enqueueJob(type: JobType, bookmarkId: number, payload?: JobPayload): void {
  const { client } = getDb();

  const pending = client
    .prepare(
      "SELECT id FROM jobs WHERE bookmark_id = ? AND type = ? AND status IN ('pending', 'processing') LIMIT 1"
    )
    .get(bookmarkId, type);

  if (pending) {
    return;
  }

  client
    .prepare(
      `INSERT INTO jobs (type, bookmark_id, status, payload, attempts, next_run_at)
       VALUES (@type, @bookmarkId, 'pending', @payload, 0, CURRENT_TIMESTAMP)`
    )
    .run({ type, bookmarkId, payload: JSON.stringify(payload ?? {}) });
}

function markFailed(jobId: number, err: unknown, attempt: number) {
  const { client } = getDb();
  const message = err instanceof Error ? err.message : 'unknown';

  if (attempt >= 3) {
    client
      .prepare(
        'UPDATE jobs SET status = "failed", error = @error, attempts = @attempts, locked_at = NULL WHERE id = @id'
      )
      .run({ id: jobId, error: message, attempts: attempt });
    return;
  }

  const delayMs = retryBackoffMs[Math.min(attempt - 1, retryBackoffMs.length - 1)];
  client
    .prepare(
      `UPDATE jobs
       SET status='pending',
           error=@error,
           attempts=@attempts,
           next_run_at=datetime('now', @delay || 'unixepoch'),
           locked_at=NULL
       WHERE id=@id`
    )
    .run({
      id: jobId,
      error: message,
      attempts: attempt,
      delay: `+${Math.ceil(delayMs / 1000)} seconds`
    });
}

function markDone(jobId: number) {
  const { client } = getDb();
  client
    .prepare("UPDATE jobs SET status='done', error=NULL, locked_at=NULL WHERE id = ?")
    .run(jobId);
}

function markProcessing(jobId: number) {
  const { client } = getDb();
  client
    .prepare("UPDATE jobs SET status='processing', locked_at=datetime('now') WHERE id=@id")
    .run({ id: jobId });
}

function markForProcessingJobRow(row: JobRow) {
  markProcessing(row.id);
}

async function processFetchJob(job: JobRow) {
  const payload = JSON.parse(job.payload || '{}') as JobPayload;
  if (!payload.url) {
    throw new Error('Missing URL for fetch job');
  }

  const metadata = await getBookmarkMetadata(payload.url);
  const { client } = getDb();

  client
    .prepare(
      `UPDATE bookmarks
       SET title = COALESCE(@title, title),
           description = COALESCE(@description, description),
           content = COALESCE(@content, content),
           og_image = COALESCE(@ogImage, og_image),
           favicon = COALESCE(@favicon, favicon),
           domain = COALESCE(@domain, domain),
           source_type = @sourceType,
           status = 'done',
           ai_status = 'pending',
           processed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = @bookmarkId`
    )
    .run({
      title: metadata.title,
      description: metadata.description,
      content: metadata.content,
      ogImage: metadata.ogImage,
      favicon: metadata.favicon,
      domain: metadata.domain,
      sourceType: metadata.sourceType,
      bookmarkId: job.bookmark_id
    });

  if (metadata.sourceType !== 'generic') {
    const statusText = metadata.description || metadata.title || metadata.content || '';
    const title = `tag: ${metadata.sourceType}`;
    if (statusText) {
      client.prepare(
        `INSERT OR REPLACE INTO tags (bookmark_id, name, source, confidence)
         VALUES (@bookmarkId, @name, 'ai', 1)`
      ).run({ bookmarkId: job.bookmark_id, name: title.toLowerCase() });
    }
  }
}

async function processJob(job: JobRow) {
  const { client } = getDb();
  markForProcessingJobRow(job);
  try {
    switch (job.type) {
      case 'fetch':
        await processFetchJob(job);
        break;
      case 'embed':
      case 'classify':
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
    markDone(job.id);
  } catch (error) {
    markFailed(job.id, error, job.attempts + 1);
    client
      .prepare('UPDATE bookmarks SET status = "failed", failure_reason = @reason WHERE id = @bookmarkId')
      .run({ reason: error instanceof Error ? error.message : 'unknown', bookmarkId: job.bookmark_id });
  }
}

async function pollAndProcess() {
  const { client } = getDb();
  const rows = client
    .prepare(
      `SELECT id, type, bookmark_id, status, payload, attempts, error, next_run_at
       FROM jobs
       WHERE status IN ('pending')
         AND next_run_at <= datetime('now')
       ORDER BY id ASC
       LIMIT 5`
    )
    .all() as JobRow[];

  for (const row of rows) {
    if (queue.size > 20 || queue.pending > 1) {
      break;
    }
    queue.add(() => processJob(row));
  }
}

export function startQueueProcessor() {
  if (started) {
    return;
  }
  started = true;

  const { client } = getDb();
  client
    .prepare(
      `UPDATE jobs SET status = 'pending'
       WHERE status = 'processing' AND locked_at < datetime('now', '-10 minutes')`
    )
    .run();

  setInterval(() => {
    void pollAndProcess();
  }, 2000);

  void pollAndProcess();
}
