import ytdl from 'yt-dlp-exec';
import fs from 'fs';
import os from 'os';
import path from 'path';

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

export async function fetchYouTubeMetadata(url: string): Promise<YtdlpMetadata | null> {
  try {
    const result = await ytdl(url, {
      dumpSingleJson: true,
      noPlaylist: true,
      skipDownload: true,
      noWarnings: true,
      quiet: true,
    });

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
      const timeLine = line;
      const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
      
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
    const outputTemplate = path.join(tmpDir, 'transcript.%(ext)s');
    
    await ytdl(url, {
      writeAutoSub: true,
      subLang: lang,
      skipDownload: true,
      output: outputTemplate,
      noWarnings: true,
      quiet: true,
    });

    const vttPath = path.join(tmpDir, `transcript.${lang}.vtt`);
    
    if (!fs.existsSync(vttPath)) {
      const files = fs.readdirSync(tmpDir);
      const vttFile = files.find(f => f.endsWith('.vtt'));
      if (!vttFile) {
        return null;
      }
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
