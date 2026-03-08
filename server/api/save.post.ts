import { defineEventHandler } from 'h3';
import { parseIngestBody, normalizeIngestPayload, ingestUrl } from '../utils/ingest';

export default defineEventHandler(async (event) => {
  const raw = await parseIngestBody(event);
  const payload = normalizeIngestPayload(raw);
  const result = ingestUrl(payload);

  return {
    id: result.id,
    status: result.status,
    duplicate: result.duplicate
  };
});
