import { z } from 'zod';
import { readBody } from 'h3';
import { getDb } from './db';
import { hashUrl } from './hash';
import { enqueueJob } from './queue';
import { normalizeTwitterUrl } from './extract';

const payloadSchema = z.object({
  url: z
    .string()
    .trim()
    .url({ message: 'Invalid URL' }),
  category: z.number().int().positive().optional(),
  categoryId: z.number().int().positive().optional(),
  tags: z.array(z.string().trim().min(1)).max(20).default([]),
  title: z.string().trim().max(300).optional(),
  text: z.string().trim().max(1000).optional()
});

function normalizeIncomingUrl(url: string): string {
  const maybe = url.trim();
  if (!maybe) {
    return maybe;
  }
  
  // Add protocol if missing
  let normalized = maybe;
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }
  
  // Normalize Twitter/X URLs to remove tracking parameters
  normalized = normalizeTwitterUrl(normalized);
  
  return normalized;
}

function detectSourceType(url: string): 'youtube' | 'twitter' | 'github' | 'generic' {
  const hostname = new URL(url).hostname;
  if (/youtube\.com$|youtu\.be$/.test(hostname)) {
    return 'youtube';
  }
  if (/x\.com$|twitter\.com$/.test(hostname)) {
    return 'twitter';
  }
  if (/github\.com$/.test(hostname)) {
    return 'github';
  }
  return 'generic';
}

export async function parseIngestBody(event: Parameters<typeof readBody>[0]) {
  const body = await readBody(event);
  return payloadSchema.parse(body);
}

export function normalizeIngestPayload(input: z.infer<typeof payloadSchema>) {
  const normalizedUrl = normalizeIncomingUrl(input.url);
  const categoryId = input.category || input.categoryId;
  return {
    url: normalizedUrl,
    categoryId,
    tags: input.tags || [],
    sourceMeta: {
      titleHint: input.title,
      textHint: input.text
    }
  };
}

export function ingestUrl(payload: ReturnType<typeof normalizeIngestPayload>) {
  const { client } = getDb();
  const normalized = payload.url;
  const urlHash = hashUrl(normalized);
  const existing = client
    .prepare('SELECT id, status FROM bookmarks WHERE url_hash = ? LIMIT 1')
    .get(urlHash) as { id: number; status: string } | undefined;

  if (existing) {
    return {
      id: existing.id,
      status: existing.status,
      duplicate: true
    };
  }

  const domain = new URL(normalized).hostname;
  const sourceType = detectSourceType(normalized);
  const result = client
    .prepare(
      `INSERT INTO bookmarks (
      url,
      url_hash,
      category_id,
      title,
      domain,
      source_type,
      status,
      description
    ) VALUES (
      @url,
      @urlHash,
      @categoryId,
      @title,
      @domain,
      @sourceType,
      'pending',
      @description
    )`
    )
    .run({
      url: normalized,
      urlHash,
      categoryId: payload.categoryId ?? null,
      title: payload.sourceMeta.titleHint ?? null,
      domain,
      sourceType,
      description: payload.sourceMeta.textHint ?? null
    });

  const bookmarkId = Number(result.lastInsertRowid);
  for (const tag of payload.tags) {
    client
      .prepare(
        `INSERT OR IGNORE INTO tags (bookmark_id, name, source, confidence)
         VALUES (@bookmarkId, @name, 'manual', 1)`
      )
      .run({ bookmarkId, name: tag.toLowerCase() });
  }

  enqueueJob('fetch', bookmarkId, { url: normalized });

  return { id: bookmarkId, status: 'pending', duplicate: false };
}
