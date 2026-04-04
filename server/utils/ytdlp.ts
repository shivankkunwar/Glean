import { exec } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface YtdlpMetadata {
  title: string;
  description: string | null;
  thumbnail: string | null;
  channelName: string | null;
  channelUrl: string | null;
  duration: number | null;
  viewCount: number | null;
  uploader: string | null;
}

export interface YtdlpSubtitle {
  text: string;
  start: number;
  duration: number;
}

function getYtdlpCommand(): string {
  return 'yt-dlp';
}

export async function fetchYouTubeMetadata(url: string): Promise<YtdlpMetadata | null> {
  try {
    const ytdlp = getYtdlpCommand();
    const { stdout } = await execAsync(
      `${ytdlp} --dump-json --no-playlist --skip-download --quiet "${url}"`,
      { timeout: 30000 }
    );

    const result = JSON.parse(stdout);

    return {
      title: result.title || 'Unknown Title',
      description: result.description || null,
      thumbnail: result.thumbnail || null,
      channelName: result.channel || result.uploader || null,
      channelUrl: result.channel_url || result.uploader_url || null,
      duration: result.duration || null,
      viewCount: result.view_count || null,
      uploader: result.uploader || null,
    };
  } catch (err) {
    console.error('yt-dlp metadata fetch failed:', err);
    return null;
  }
}

function parseVTT(vttContent: string): YtdlpSubtitle[] {
  const subtitles: YtdlpSubtitle[] = [];
  const lines = vttContent.split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.includes('-->')) {
      const timeMatch = line.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);

      if (timeMatch && timeMatch.length >= 8) {
        const start = parseInt(timeMatch[1]!) * 3600 + parseInt(timeMatch[2]!) * 60 + parseInt(timeMatch[3]!) + parseInt(timeMatch[4]!) / 1000;
        const end = parseInt(timeMatch[5]!) * 3600 + parseInt(timeMatch[6]!) * 60 + parseInt(timeMatch[7]!) + parseInt(timeMatch[8]!) / 1000;

        i++;
        let text = '';
        while (i < lines.length) {
          const textLine = lines[i]!;
          if (textLine.trim() === '' || textLine.includes('-->')) break;
          text += (text ? ' ' : '') + textLine.replace(/<[^>]+>/g, '').trim();
          i++;
        }

        if (text) {
          subtitles.push({
            text,
            start,
            duration: end - start,
          });
        }
        continue;
      }
    }
    i++;
  }

  return subtitles;
}

export async function fetchYouTubeTranscript(url: string, lang = 'en'): Promise<YtdlpSubtitle[] | null> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ytdlp-transcript-'));

  try {
    const vttPath = path.join(tmpDir, `transcript.${lang}.vtt`);
    const ytdlp = getYtdlpCommand();

    await execAsync(
      `${ytdlp} --write-auto-sub --sub-lang ${lang} --sub-format vtt --skip-download --quiet --output "${vttPath}" "${url}"`,
      { timeout: 60000 }
    );

    if (!fs.existsSync(vttPath)) {
      return null;
    }

    const vttContent = fs.readFileSync(vttPath, 'utf-8');
    return parseVTT(vttContent);
  } catch (err) {
    console.error('yt-dlp transcript fetch failed:', err);
    return null;
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // cleanup failed, ignore
    }
  }
}
