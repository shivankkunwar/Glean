import PQueue from 'p-queue';
import { getDb } from './db';
import { getBookmarkMetadata } from './extract';
import { buildCanonicalDocument } from './ai/canonicalize';
import { resolveProvider, resolveProviderDecision } from './ai';
import { saveEmbedding } from './embeddings';
import { QUEUE_CONCURRENCY, FETCH_TIMEOUT_MS, AI_TIMEOUT_MS, RETRY_BACKOFF_MS } from './constants';

export type JobType = 'fetch' | 'normalize' | 'classify' | 'summarize' | 'embed' | 'reindex';

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

const queue = new PQueue({ concurrency: QUEUE_CONCURRENCY });
const scheduledJobs = new Set<number>();
let started = false;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

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

  // Exponential backoff with jitter
  const baseDelay = RETRY_BACKOFF_MS[Math.min(attempt - 1, RETRY_BACKOFF_MS.length - 1)];
  const jitterMs = Math.floor(Math.random() * 2000) - 1000; // ±1 second jitter
  const delayMs = Math.max(1000, baseDelay + jitterMs);

  client
    .prepare(
      `UPDATE jobs
       SET status='pending',
           error=@error,
           attempts=@attempts,
           next_run_at=datetime('now', @delay),
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

function claimJob(jobId: number): boolean {
  const { client } = getDb();
  const result = client
    .prepare(
      `UPDATE jobs
       SET status='processing', locked_at=datetime('now')
       WHERE id=@id AND status='pending'`
    )
    .run({ id: jobId });

  return result.changes > 0;
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
           source_metadata = @sourceMetadata,
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
      sourceMetadata: metadata.sourceMetadata ? JSON.stringify(metadata.sourceMetadata) : null,
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

  enqueueJob('normalize', job.bookmark_id);
  enqueueJob('classify', job.bookmark_id);
  enqueueJob('summarize', job.bookmark_id);
  enqueueJob('embed', job.bookmark_id);
  enqueueJob('reindex', job.bookmark_id);
}

function getCanonicalForBookmark(bookmarkId: number) {
  const { client } = getDb();
  const bookmark = client
    .prepare(
      `SELECT id, url, title, description, content, source_type, domain, source_metadata
       FROM bookmarks
       WHERE id = ?
       LIMIT 1`
    )
    .get(bookmarkId) as
    | {
        id: number;
        url: string;
        title: string | null;
        description: string | null;
        content: string | null;
        source_type: string;
        domain: string | null;
        source_metadata: string | null;
      }
    | undefined;

  if (!bookmark) {
    throw new Error(`Bookmark ${bookmarkId} not found`);
  }

  // Parse source metadata if present
  let sourceMetadata: Record<string, unknown> | undefined;
  if (bookmark.source_metadata) {
    try {
      sourceMetadata = JSON.parse(bookmark.source_metadata);
    } catch {
      // Ignore parse errors
    }
  }

  return buildCanonicalDocument({
    title: bookmark.title,
    description: bookmark.description,
    content: bookmark.content,
    domain: bookmark.domain,
    sourceType: bookmark.source_type as
      | 'youtube'
      | 'twitter'
      | 'github'
      | 'article'
      | 'generic'
      | 'other',
    url: bookmark.url,
    sourceMetadata
  });
}

function persistArtifact(input: {
  bookmarkId: number;
  kind: string;
  value: unknown;
  provider: string;
  model: string;
  confidence?: number;
  skipped?: boolean;
  reason?: string;
}) {
  const { client } = getDb();
  client
    .prepare(
      `INSERT INTO bookmark_ai_artifacts
        (bookmark_id, kind, value_json, provider, model, version, confidence, skipped, reason, created_at)
       VALUES
        (@bookmarkId, @kind, @valueJson, @provider, @model, 'v1', @confidence, @skipped, @reason, CURRENT_TIMESTAMP)`
    )
    .run({
      bookmarkId: input.bookmarkId,
      kind: input.kind,
      valueJson: JSON.stringify(input.value ?? {}),
      provider: input.provider,
      model: input.model,
      confidence: input.confidence ?? null,
      skipped: input.skipped ? 1 : 0,
      reason: input.reason ?? null
    });
}

async function processNormalizeJob(job: JobRow) {
  const canonical = getCanonicalForBookmark(job.bookmark_id);
  const { client } = getDb();

  client
    .prepare(
      `UPDATE bookmarks
       SET canonical_text = @canonicalText,
           updated_at = CURRENT_TIMESTAMP,
           ai_status = 'pending'
       WHERE id = @bookmarkId`
    )
    .run({
      canonicalText: canonical.canonicalText,
      bookmarkId: job.bookmark_id
    });
}

async function processClassifyJob(job: JobRow) {
  const canonical = getCanonicalForBookmark(job.bookmark_id);
  const decision = resolveProviderDecision('classify', canonical);
  const provider = resolveProvider('classify', canonical);
  const result = await provider.classify(canonical);
  const { client } = getDb();

  persistArtifact({
    bookmarkId: job.bookmark_id,
    kind: 'tags',
    value: {
      tags: result.tags,
      topics: result.topics ?? [],
      categoryHint: result.categoryHint,
      decision
    },
    provider: result.provider,
    model: result.model,
    confidence: result.confidence,
    skipped: result.skipped,
    reason: result.reason
  });

  if (!result.skipped && result.tags.length) {
    const insertTag = client.prepare(
      `INSERT OR IGNORE INTO tags (bookmark_id, name, source, confidence)
       VALUES (@bookmarkId, @name, 'ai', @confidence)`
    );

    for (const tag of result.tags.slice(0, 12)) {
      insertTag.run({
        bookmarkId: job.bookmark_id,
        name: tag.toLowerCase().trim(),
        confidence: result.confidence || 0.5
      });
    }
  }

  client
    .prepare(
      `UPDATE bookmarks
       SET classify_model = @model,
           classification_version = @version,
           ai_status = CASE WHEN @skipped = 1 THEN 'skipped' ELSE 'in_progress' END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = @bookmarkId`
    )
    .run({
      model: result.model,
      version: result.version ?? 'v1',
      skipped: result.skipped ? 1 : 0,
      bookmarkId: job.bookmark_id
    });
}

async function processSummarizeJob(job: JobRow) {
  const canonical = getCanonicalForBookmark(job.bookmark_id);
  const decision = resolveProviderDecision('summarize', canonical);
  const provider = resolveProvider('summarize', canonical);
  const result = await provider.summarize(canonical);
  const { client } = getDb();

  persistArtifact({
    bookmarkId: job.bookmark_id,
    kind: 'summary',
    value: {
      summary: result.summary,
      decision
    },
    provider: result.provider,
    model: result.model,
    confidence: result.confidence,
    skipped: result.skipped,
    reason: result.reason
  });

  client
    .prepare(
      `UPDATE bookmarks
       SET summary = @summary,
           summary_model = @model,
           quality_score = @confidence,
           ai_status = CASE WHEN @skipped = 1 THEN 'skipped' ELSE 'in_progress' END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = @bookmarkId`
    )
    .run({
      summary: result.summary || null,
      model: result.model,
      confidence: result.confidence || null,
      skipped: result.skipped ? 1 : 0,
      bookmarkId: job.bookmark_id
    });
}

async function processEmbedJob(job: JobRow) {
  const canonical = getCanonicalForBookmark(job.bookmark_id);
  const decision = resolveProviderDecision('embed', canonical);
  const provider = resolveProvider('embed', canonical);
  const result = await provider.embed([canonical.canonicalText]);
  const { client } = getDb();

  persistArtifact({
    bookmarkId: job.bookmark_id,
    kind: 'embedding',
    value: {
      vectors: result.vectors,
      decision
    },
    provider: result.provider,
    model: result.model,
    skipped: result.skipped,
    reason: result.reason
  });

  // Save the embedding vector if not skipped
  if (!result.skipped && result.vectors.length > 0 && result.vectors[0].length > 0) {
    await saveEmbedding(
      job.bookmark_id,
      result.vectors[0],
      result.model,
      result.version ?? 'v1'
    );
  }

  client
    .prepare(
      `UPDATE bookmarks
       SET embed_model = @model,
           embedding_version = @version,
           ai_status = CASE WHEN @skipped = 1 THEN 'skipped' ELSE 'done' END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = @bookmarkId`
    )
    .run({
      model: result.model,
      version: result.version ?? 'v1',
      skipped: result.skipped ? 1 : 0,
      bookmarkId: job.bookmark_id
    });
}

async function processReindexJob(job: JobRow) {
  const { client } = getDb();
  client
    .prepare(
      `UPDATE bookmarks
       SET artifact_policy_version = 'v1',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .run(job.bookmark_id);
}

async function processJob(job: JobRow) {
  const { client } = getDb();
  if (!claimJob(job.id)) {
    return;
  }

  try {
    switch (job.type) {
      case 'fetch':
        await withTimeout(processFetchJob(job), FETCH_TIMEOUT_MS, 'fetch job');
        break;
      case 'normalize':
        await withTimeout(processNormalizeJob(job), AI_TIMEOUT_MS, 'normalize job');
        break;
      case 'embed':
        await withTimeout(processEmbedJob(job), AI_TIMEOUT_MS, 'embed job');
        break;
      case 'classify':
        await withTimeout(processClassifyJob(job), AI_TIMEOUT_MS, 'classify job');
        break;
      case 'summarize':
        await withTimeout(processSummarizeJob(job), AI_TIMEOUT_MS, 'summarize job');
        break;
      case 'reindex':
        await withTimeout(processReindexJob(job), AI_TIMEOUT_MS, 'reindex job');
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
    markDone(job.id);
  } catch (error) {
    try {
      markFailed(job.id, error, job.attempts + 1);
    } catch (markError) {
      client
        .prepare(
          'UPDATE jobs SET status = "failed", error = @error, attempts = @attempts, locked_at = NULL WHERE id = @id'
        )
        .run({
          id: job.id,
          error: markError instanceof Error ? markError.message : 'failed to update retry status',
          attempts: job.attempts + 1
        });
    }

    if (job.type === 'fetch') {
      client
        .prepare('UPDATE bookmarks SET status = "failed", failure_reason = @reason WHERE id = @bookmarkId')
        .run({ reason: error instanceof Error ? error.message : 'unknown', bookmarkId: job.bookmark_id });
    } else {
      client
        .prepare('UPDATE bookmarks SET ai_status = "failed", failure_reason = @reason WHERE id = @bookmarkId')
        .run({ reason: error instanceof Error ? error.message : 'unknown', bookmarkId: job.bookmark_id });
    }
  }
}

async function pollAndProcess() {
  const { client } = getDb();

  client
    .prepare(
      `UPDATE jobs
       SET status = 'pending', locked_at = NULL
       WHERE status = 'processing'
         AND locked_at < datetime('now', '-2 minutes')`
    )
    .run();

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

    if (scheduledJobs.has(row.id)) {
      continue;
    }

    scheduledJobs.add(row.id);
    queue.add(async () => {
      try {
        await processJob(row);
      } finally {
        scheduledJobs.delete(row.id);
      }
    });
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
