import { Readability } from '@mozilla/readability';
import { DOMParser } from 'linkedom';
import { load } from 'cheerio';

export type BookmarkSourceType = 'youtube' | 'twitter' | 'github' | 'article' | 'generic';

export type BookmarkMetadata = {
  title: string | null;
  description: string | null;
  content: string | null;
  ogImage: string | null;
  favicon: string | null;
  domain: string;
  sourceType: BookmarkSourceType;
};

function parseUrlParts(url: string) {
  const parsed = new URL(url);
  return {
    hostname: parsed.hostname,
    isYouTube: /youtube\.com$|youtu\.be$/.test(parsed.hostname),
    isTwitter: /x\.com$|twitter\.com$/.test(parsed.hostname),
    isGitHub: /github\.com$/.test(parsed.hostname),
    isYoutubeWatch: /\/watch/.test(parsed.pathname) || /youtu\.be/.test(parsed.hostname)
  };
}

async function fetchJson(url: string, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: 'GET', signal: controller.signal, headers: { 'user-agent': 'Glean/1.0 (+https://glean.app)' } });
    if (!response.ok) {
      return null;
    }
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(url: string, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'user-agent': 'Glean/1.0 (+https://glean.app)'
      }
    });

    if (!response.ok) {
      return null;
    }

    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function safeText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const cleaned = value.trim();
  return cleaned || null;
}

function fallbackMeta($: ReturnType<typeof load>, fallbackUrl: string, parts: ReturnType<typeof parseUrlParts>) {
  const title =
    safeText($('meta[property="og:title"]').attr('content')) ||
    safeText($('meta[name="twitter:title"]').attr('content')) ||
    safeText($('title').first().text()) ||
    parts.hostname;

  const description =
    safeText($('meta[name="description"]').attr('content')) ||
    safeText($('meta[property="og:description"]').attr('content')) ||
    null;

  const ogImage =
    safeText($('meta[property="og:image"]').attr('content')) ||
    safeText($('meta[name="twitter:image"]').attr('content')) ||
    null;

  const favicon =
    safeText($('link[rel="icon"]').attr('href')) ||
    safeText($('link[rel="shortcut icon"]').attr('href')) ||
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(parts.hostname)}&sz=64`;

  return { title, description, ogImage, favicon };
}

export async function getBookmarkMetadata(url: string): Promise<BookmarkMetadata> {
  const parsed = parseUrlParts(url);
  const sourceType: BookmarkSourceType = parsed.isYouTube
    ? 'youtube'
    : parsed.isTwitter
      ? 'twitter'
      : parsed.isGitHub
        ? 'github'
        : 'generic';

  if (parsed.isYouTube && parsed.isYoutubeWatch) {
    const payload = await fetchJson(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (payload) {
      return {
        title: safeText(payload.title),
        description: safeText(payload.author_name),
        content: safeText(payload.title),
        ogImage: safeText(payload.thumbnail_url),
        favicon: 'https://www.youtube.com/favicon.ico',
        domain: parsed.hostname,
        sourceType
      };
    }
  }

  if (parsed.isTwitter) {
    const payload = await fetchJson(`https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`);
    if (payload) {
      return {
        title: safeText(payload.author_name) ?? 'Tweet',
        description: safeText(payload.html),
        content: safeText(payload.html),
        ogImage: safeText(payload.thumbnail_url),
        favicon: 'https://abs.twimg.com/favicons/twitter.ico',
        domain: parsed.hostname,
        sourceType
      };
    }
  }

  if (parsed.isGitHub) {
    const html = await fetchText(url);
    if (!html) {
      return {
        title: parsed.hostname,
        description: null,
        content: null,
        ogImage: null,
        favicon: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsed.hostname)}&sz=64`,
        domain: parsed.hostname,
        sourceType
      };
    }

    const $ = load(html);
    const meta = fallbackMeta($, url, parsed);
    return {
      title: meta.title,
      description: meta.description,
      content: meta.description,
      ogImage: meta.ogImage,
      favicon: meta.favicon,
      domain: parsed.hostname,
      sourceType
    };
  }

  const html = await fetchText(url);
  if (!html) {
    return {
      title: parsed.hostname,
      description: null,
      content: null,
      ogImage: null,
      favicon: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsed.hostname)}&sz=64`,
      domain: parsed.hostname,
      sourceType
    };
  }

  const $ = load(html);
  const meta = fallbackMeta($, url, parsed);

  const readability = new Readability(DOMParser().parseFromString(html, 'text/html').window.document);
  const article = readability.parse();

  return {
    title: meta.title,
    description: article?.excerpt ?? meta.description,
    content: article?.textContent ? article.textContent.slice(0, 4000) : meta.description,
    ogImage: meta.ogImage,
    favicon: meta.favicon,
    domain: parsed.hostname,
    sourceType
  };
}
