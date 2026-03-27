import { defineEventHandler, readBody, sendRedirect } from 'h3';
import { normalizeIngestPayload, ingestUrl } from '../utils/ingest';

function extractUrlFromText(text?: string) {
  if (!text) return null;
  const match = text.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : null;
}

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, string>>(event);

  const inputUrl =
    body?.url || (body?.text && extractUrlFromText(body.text)) || body?.title || extractUrlFromText(body?.title);

  if (!inputUrl) {
    return sendRedirect(event, '/?shared=0', 302);
  }

  try {
    const payload = {
      url: inputUrl,
      tags: [] as string[],
      title: body?.title || undefined,
      text: body?.text || undefined
    };

    await ingestUrl(normalizeIngestPayload(payload as any));
    return sendRedirect(event, '/?shared=1', 302);
  } catch {
    return sendRedirect(event, '/?shared=0', 302);
  }
});
