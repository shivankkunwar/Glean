// server/utils/transcriptProxy.ts
// Nuxt/Nitro integration for YouTube Transcript Proxy Worker

export interface TranscriptItem {
  text: string;
  start: number;
  duration: number;
}

interface ProxyResponse {
  videoId: string;
  transcript: TranscriptItem[] | null;
  language?: string;
  source?: 'android_api' | 'web_scrape';
  error?: string;
}

const PROXY_TIMEOUT_MS = 8000;

export async function fetchTranscriptViaProxy(videoId: string): Promise<TranscriptItem[] | null> {
  const proxyUrl = process.env.YOUTUBE_PROXY_URL;
  const proxySecret = process.env.YOUTUBE_PROXY_SECRET;

  if (!proxyUrl || !proxySecret) {
    return fetchDirect(videoId);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

    const response = await fetch(`${proxyUrl}/transcript?videoId=${encodeURIComponent(videoId)}`, {
      method: 'GET',
      headers: {
        'X-Proxy-Secret': proxySecret,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Proxy returned ${response.status}`);
      return null;
    }

    const data: ProxyResponse = await response.json();

    if (!data.transcript) {
      console.error(`Proxy error for ${videoId}: ${data.error}`);
      return null;
    }

    return data.transcript;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error(`Proxy timeout for ${videoId}`);
    } else {
      console.error(`Proxy fetch failed for ${videoId}:`, err);
    }
    return null;
  }
}

async function fetchDirect(videoId: string): Promise<TranscriptItem[] | null> {
  try {
    const { YoutubeTranscript } = await import('youtube-transcript/dist/youtube-transcript.esm.js');
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    if (transcript && transcript.length > 0) {
      return transcript.map((t: { text: string; offset?: number; duration?: number }) => ({
        text: t.text,
        start: t.offset || 0,
        duration: t.duration || 0
      }));
    }
    return null;
  } catch (err) {
    console.error(`Direct fetch failed for ${videoId}:`, err);
    return null;
  }
}