import { readBody } from 'h3';
import { defineEventHandler } from 'h3';
import { parseIngestBody, normalizeIngestPayload, ingestUrl } from '../utils/ingest';

function extractUrlFromText(text?: string) {
  if (!text) {
    return null;
  }
  const match = text.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : null;
}

export default defineEventHandler(async (event) => {
  const contentType = String(event.headers.get('content-type') || '');
  const body = await readBody<Record<string, string>>(event);

  const inputUrl =
    body?.url || body?.text && extractUrlFromText(body.text) || body?.title || extractUrlFromText(body?.title);

  if (!inputUrl) {
    return { statusCode: 400, message: 'No URL provided in share payload' };
  }

  const payload = {
    url: inputUrl,
    tags: [],
    title: body?.title || undefined,
    text: body?.text || undefined
  };

  const result = ingestUrl(normalizeIngestPayload(payload as any));
  return {
    ok: true,
    id: result.id,
    status: result.status,
    duplicate: result.duplicate,
    originalContentType: contentType
  };
});
