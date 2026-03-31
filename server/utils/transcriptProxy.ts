// server/utils/transcriptProxy.ts
// Nuxt/Nitro integration for YouTube Transcript API

export interface TranscriptItem {
  text: string;
  start: number;
  duration: number;
}

const PROXY_TIMEOUT_MS = 10000;

export async function fetchTranscriptViaProxy(videoId: string): Promise<TranscriptItem[] | null> {
  const supadataKey = process.env.SUPADATA_API_KEY;

  if (!supadataKey) {
    console.error('SUPADATA_API_KEY not configured');
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

    const response = await fetch(
      `https://api.supadata.ai/v1/youtube/transcript?videoId=${encodeURIComponent(videoId)}&lang=en`,
      {
        headers: { 'x-api-key': supadataKey },
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Supadata API returned ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data.content || !Array.isArray(data.content)) {
      console.error(`Supadata: no content for ${videoId}`);
      return null;
    }

    return data.content.map((item: { text: string; offset?: number; duration?: number }) => ({
      text: item.text,
      start: item.offset || 0,
      duration: item.duration || 0
    }));
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error(`Supadata timeout for ${videoId}`);
    } else {
      console.error(`Supadata fetch failed for ${videoId}:`, err);
    }
    return null;
  }
}
