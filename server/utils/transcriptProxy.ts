// server/utils/transcriptProxy.ts
// Nuxt/Nitro integration for YouTube Transcript API via yt-dlp

export interface TranscriptItem {
  text: string;
  start: number;
  duration: number;
}

export async function fetchTranscriptViaProxy(url: string): Promise<TranscriptItem[] | null> {
  try {
    const { fetchYouTubeTranscript } = await import('./ytdlp');
    const transcript = await fetchYouTubeTranscript(url, 'en');
    return transcript;
  } catch (err) {
    console.error(`yt-dlp transcript fetch failed for ${url}:`, err);
    return null;
  }
}
