import { Readability } from '@mozilla/readability';
import { DOMParser } from 'linkedom';
import { load } from 'cheerio';

export type BookmarkSourceType = 'youtube' | 'twitter' | 'github' | 'article' | 'generic';

export type TweetMetadata = {
  text: string;
  authorName: string;
  authorHandle: string;
  tweetId: string;
  publishedAt: string;
  links: string[];
  resolvedLinks?: Record<string, string>;
  rawHtml: string;
  engagement?: {
    replies?: number;
    retweets?: number;
    likes?: number;
    bookmarks?: number;
  };
  media?: {
    photos?: Array<{ url: string }>;
    videos?: Array<{ url: string }>;
  };
  thread?: Array<{
    text?: string;
    author?: { name?: string; screen_name?: string };
  }>;
  quotedTweet?: {
    text?: string;
    author?: { name?: string; screen_name?: string };
  };
};

export type BookmarkMetadata = {
  title: string | null;
  description: string | null;
  content: string | null;
  ogImage: string | null;
  favicon: string | null;
  domain: string;
  sourceType: BookmarkSourceType;
  sourceMetadata?: TweetMetadata | Record<string, unknown>;
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

export function normalizeTwitterUrl(url: string): string {
  try {
    const parsed = new URL(url);
    
    // Check if it's a Twitter/X URL
    if (!/x\.com$|twitter\.com$/.test(parsed.hostname)) {
      return url;
    }
    
    // Extract status/tweet ID from path
    const statusMatch = parsed.pathname.match(/\/status\/(\d+)/);
    if (!statusMatch) {
      return url;
    }
    
    const tweetId = statusMatch[1];
    
    // Extract handle if present
    const handleMatch = parsed.pathname.match(/^\/([^\/]+)\/status\//);
    const handle = handleMatch ? handleMatch[1] : 'i';
    
    // Build canonical URL without tracking params
    const canonicalUrl = `https://x.com/${handle}/status/${tweetId}`;
    
    return canonicalUrl;
  } catch {
    return url;
  }
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

async function resolveTcoLinks(links: string[]): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();
  
  for (const link of links) {
    if (!link.includes('t.co')) {
      resolved.set(link, link);
      continue;
    }
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(link, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      clearTimeout(timeout);
      
      const location = response.headers.get('location');
      if (location) {
        resolved.set(link, location);
      } else {
        resolved.set(link, link);
      }
    } catch {
      resolved.set(link, link);
    }
  }
  
  return resolved;
}

async function fetchFullTweetViaFxTwitter(tweetUrl: string): Promise<{
  text: string;
  authorName: string;
  authorHandle: string;
  tweetId: string;
  resolvedLinks?: Map<string, string>;
  engagement?: {
    replies?: number;
    retweets?: number;
    likes?: number;
    bookmarks?: number;
  };
  media?: {
    photos?: Array<{ url: string }>;
    videos?: Array<{ url: string }>;
  };
  thread?: Array<{
    text?: string;
    author?: { name?: string; screen_name?: string };
  }>;
  quotedTweet?: {
    text?: string;
    author?: { name?: string; screen_name?: string };
  };
} | null> {
  try {
    // Extract username and tweet ID from URL
    const urlMatch = tweetUrl.match(/(?:x\.com|twitter\.com)\/([^\/]+)\/status\/(\d+)/);
    if (!urlMatch) {
      return null;
    }
    
    const username = urlMatch[1];
    const tweetId = urlMatch[2];
    
    // Use FxTwitter API (FixTweet) - primary source for full tweet text
    const response = await fetch(
      `https://api.fxtwitter.com/${username}/status/${tweetId}`,
      {
        headers: {
          'user-agent': 'Glean/1.0 (+https://glean.app)'
        }
      }
    );
    
    if (!response.ok) {
      // Try vxTwitter as fallback (same API, different host)
      const vxResponse = await fetch(
        `https://api.vxtwitter.com/${username}/status/${tweetId}`,
        {
          headers: {
            'user-agent': 'Glean/1.0 (+https://glean.app)'
          }
        }
      );
      
      if (!vxResponse.ok) {
        return null;
      }
      
      const vxData = await vxResponse.json() as {
        code?: number;
        tweet?: {
          text?: string;
          author?: {
            name?: string;
            screen_name?: string;
          };
        };
      };
      
      if (vxData.code === 200 && vxData.tweet?.text) {
        return {
          text: vxData.tweet.text,
          authorName: vxData.tweet.author?.name || '',
          authorHandle: vxData.tweet.author?.screen_name || '',
          tweetId
        };
      }
      
      return null;
    }
    
    const data = await response.json() as {
      code?: number;
      tweet?: {
        text?: string;
        author?: {
          name?: string;
          screen_name?: string;
        };
        media?: {
          photos?: Array<{ url: string }>;
          videos?: Array<{ url: string }>;
        };
        replies?: number;
        retweets?: number;
        likes?: number;
        bookmarks?: number;
        thread?: Array<{
          text?: string;
          author?: { name?: string; screen_name?: string };
        }>;
        quoted_tweet?: {
          text?: string;
          author?: { name?: string; screen_name?: string };
        };
      };
    };
    
    if (data.code === 200 && data.tweet?.text) {
      // Extract t.co links from tweet text
      const tcoLinks = [...data.tweet.text.matchAll(/https?:\/\/t\.co\/\w+/g)].map(m => m[0]);
      
      // Resolve t.co links
      const resolvedLinks = tcoLinks.length > 0 
        ? await resolveTcoLinks(tcoLinks)
        : new Map<string, string>();
      
      // Build full thread text if it's a thread
      let fullThreadText = data.tweet.text;
      if (data.tweet.thread && data.tweet.thread.length > 0) {
        const threadTexts = data.tweet.thread
          .filter(t => t.text)
          .map((t, i) => `[${i + 1}/${data.tweet.thread!.length}] ${t.text}`);
        fullThreadText = [data.tweet.text, ...threadTexts].join('\n\n');
      }
      
      return {
        text: fullThreadText,
        authorName: data.tweet.author?.name || '',
        authorHandle: data.tweet.author?.screen_name || '',
        tweetId,
        resolvedLinks,
        engagement: {
          replies: data.tweet.replies,
          retweets: data.tweet.retweets,
          likes: data.tweet.likes,
          bookmarks: data.tweet.bookmarks
        },
        media: data.tweet.media,
        thread: data.tweet.thread,
        quotedTweet: data.tweet.quoted_tweet
      };
    }
    
    return null;
  } catch {
    return null;
  }
}

async function fetchFullTweetViaCDN(tweetId: string): Promise<{ text: string; authorName: string; authorHandle: string } | null> {
  try {
    const bearerToken = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnLr7LqXTWQB';
    const response = await fetch(
      `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&token=${encodeURIComponent(bearerToken)}`,
      {
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }
    );
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json() as {
      text?: string;
      user?: { name?: string; screen_name?: string };
    };
    
    if (data.text) {
      return {
        text: data.text,
        authorName: data.user?.name || '',
        authorHandle: data.user?.screen_name || ''
      };
    }
    
    return null;
  } catch {
    return null;
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

function cleanHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8211;/g, '–')
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&hellip;/g, '...')
    .replace(/&#8230;/g, '...');
}

function extractTweetMetadata(html: string, url: string): TweetMetadata | null {
  try {
    const $ = load(html);
    
    // Find the blockquote with twitter-tweet class
    const blockquote = $('blockquote.twitter-tweet');
    if (!blockquote.length) {
      return null;
    }
    
    // Extract tweet text from the paragraph
    const paragraph = blockquote.find('p').first();
    let tweetText = paragraph.html() || '';
    
    // Convert <br> tags to newlines for better readability
    tweetText = tweetText.replace(/<br\s*\/?>/gi, '\n');
    
    // Remove all other HTML tags
    tweetText = tweetText.replace(/<[^>]+>/g, '');
    
    // Clean up HTML entities
    tweetText = cleanHtmlEntities(tweetText);
    
    // Normalize whitespace
    tweetText = tweetText.replace(/\n{3,}/g, '\n\n').trim();
    
    // Extract author info from the last link in the blockquote
    const links = blockquote.find('a');
    let authorName = '';
    let authorHandle = '';
    let publishedAt = '';
    
    links.each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim();
      
      // Author link usually has format: "Name (@handle)"
      if (text.includes('(@') && href.includes('twitter.com') || href.includes('x.com')) {
        const match = text.match(/^(.+)\s*\(@(.+)\)$/);
        if (match) {
          authorName = match[1].trim();
          authorHandle = match[2].trim();
        }
      }
      
      // Date link
      if (href.includes('/status/') && text.match(/\d{1,2}\s+\w+\s+\d{4}/)) {
        publishedAt = text;
      }
    });
    
    // If no author name found, try to get it from the last text node
    if (!authorName) {
      const fullText = blockquote.text();
      const match = fullText.match(/—\s*(.+?)\s*\(@(.+?)\)/);
      if (match) {
        authorName = match[1].trim();
        authorHandle = match[2].trim();
      }
    }
    
    // Extract tweet ID from URL
    const tweetIdMatch = url.match(/status\/(\d+)/);
    const tweetId = tweetIdMatch ? tweetIdMatch[1] : '';
    
    // Extract all links from the tweet (excluding platform links)
    const extractedLinks: string[] = [];
    paragraph.find('a').each((_, el) => {
      const href = $(el).attr('href');
      if (href && !href.includes('twitter.com') && !href.includes('x.com') && !href.includes('t.co')) {
        extractedLinks.push(href);
      }
    });
    
    // Also look for t.co links and resolve them (we'll store the t.co URLs for now)
    paragraph.find('a').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.includes('t.co') && !extractedLinks.includes(href)) {
        extractedLinks.push(href);
      }
    });
    
    return {
      text: tweetText,
      authorName: authorName || 'Unknown',
      authorHandle: authorHandle || '',
      tweetId,
      publishedAt: publishedAt || '',
      links: extractedLinks,
      rawHtml: html
    };
  } catch (error) {
    console.error('Failed to extract tweet metadata:', error);
    return null;
  }
}

function createTweetTitle(tweetText: string): string {
  // Use first sentence or first 100 characters
  const firstSentence = tweetText.split(/[.!?]\s+/)[0];
  if (firstSentence.length <= 120) {
    return firstSentence.trim();
  }
  
  // If first sentence is too long, truncate at word boundary
  const truncated = tweetText.slice(0, 120);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > 80) {
    return truncated.slice(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

function extractEntitiesFromTweet(tweetText: string): string[] {
  const entities: string[] = [];
  
  // Match numbered list items (1. 2. etc.)
  const listItemRegex = /^\d+\.\s*(.+)$/gm;
  let match;
  while ((match = listItemRegex.exec(tweetText)) !== null) {
    const item = match[1].trim();
    // Extract the main concept from the list item (usually the first few words before any dash or details)
    const concept = item.split(/[-—–]/)[0].trim();
    if (concept.length > 2) {
      entities.push(concept);
    }
  }
  
  // Match quoted phrases
  const quotedRegex = /"([^"]+)"/g;
  while ((match = quotedRegex.exec(tweetText)) !== null) {
    entities.push(match[1]);
  }
  
  // Match capitalized technical terms (e.g., "CAP Theorem", "Hystrix")
  const techTermsRegex = /\b[A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)+\b/g;
  while ((match = techTermsRegex.exec(tweetText)) !== null) {
    const term = match[0];
    // Filter out common words
    if (!/^(The|This|That|These|Those|A|An|And|But|Or|For|With|From|To|In|On|At|By|As|Is|Was|Are|Were|Be|Been|Have|Has|Had|Do|Does|Did|Will|Would|Could|Should|May|Might|Must|Can|Shall|If|Then|Else|When|Where|Why|How|What|Who|Which|Whose|Whom|All|Any|Both|Each|Every|Few|More|Most|Other|Some|Such|No|Nor|Not|Only|Own|Same|So|Than|Too|Very|Just|Now|Also|Back|Down|Out|Over|Off|Up|Here|There|Up|Down|Out|Off|Over|Under|Again|Further|Then|Once)$/i.test(term)) {
      entities.push(term);
    }
  }
  
  // Remove duplicates
  return [...new Set(entities)];
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
    const normalizedUrl = normalizeTwitterUrl(url);
    
    // Extract tweet ID for fallback methods
    const tweetIdMatch = normalizedUrl.match(/status\/(\d+)/);
    const tweetId = tweetIdMatch ? tweetIdMatch[1] : null;
    
    // Try multiple sources to get full tweet text (in order of preference)
    let fullTweetText: string | null = null;
    let fullTweetAuthor: { name: string; handle: string } | null = null;
    
    // 1. Try FxTwitter API first (best for full text, includes long tweets/notes)
    const fxtwitterResult = await fetchFullTweetViaFxTwitter(normalizedUrl);
    if (fxtwitterResult?.text) {
      fullTweetText = fxtwitterResult.text;
      fullTweetAuthor = { name: fxtwitterResult.authorName, handle: fxtwitterResult.authorHandle };
    }
    
    // 2. Fallback to Twitter's CDN syndication API
    if (!fullTweetText && tweetId) {
      const cdnResult = await fetchFullTweetViaCDN(tweetId);
      if (cdnResult?.text) {
        fullTweetText = cdnResult.text;
        fullTweetAuthor = { name: cdnResult.authorName, handle: cdnResult.authorHandle };
      }
    }
    
    const payload = await fetchJson(`https://publish.twitter.com/oembed?url=${encodeURIComponent(normalizedUrl)}&omit_script=true`);
    if (payload) {
      const html = safeText(payload.html);
      if (!html) {
        return {
          title: safeText(payload.author_name) ?? 'Tweet',
          description: fullTweetText?.slice(0, 500) || null,
          content: fullTweetText,
          ogImage: safeText(payload.thumbnail_url),
          favicon: 'https://abs.twimg.com/favicons/twitter.ico',
          domain: parsed.hostname,
          sourceType,
          sourceMetadata: fullTweetText ? {
            text: fullTweetText,
            authorName: fullTweetAuthor?.name || safeText(payload.author_name) || 'Unknown',
            authorHandle: fullTweetAuthor?.handle || '',
            tweetId: tweetId || '',
            publishedAt: '',
            links: [],
            resolvedLinks: fxtwitterResult?.resolvedLinks ? Object.fromEntries(fxtwitterResult.resolvedLinks) : undefined,
            rawHtml: '',
            entities: extractEntitiesFromTweet(fullTweetText),
            fullTextFetched: true,
            engagement: fxtwitterResult?.engagement,
            media: fxtwitterResult?.media
          } : undefined
        };
      }
      
      // Extract clean tweet metadata from oEmbed
      const tweetMeta = extractTweetMetadata(html, normalizedUrl);
      
      // Use the best available text source
      const tweetText = fullTweetText || tweetMeta?.text || '';
      const authorName = fullTweetAuthor?.name || tweetMeta?.authorName || safeText(payload.author_name) || 'Unknown';
      const authorHandle = fullTweetAuthor?.handle || tweetMeta?.authorHandle || '';
      
      // Create a meaningful title from the tweet text
      const title = tweetText ? createTweetTitle(tweetText) : safeText(payload.author_name) ?? 'Tweet';
      
      // Add extracted entities to the metadata
      const entities = tweetText ? extractEntitiesFromTweet(tweetText) : [];
      
      return {
        title,
        // For tweets, keep full description since they're important content (not metadata)
        description: tweetText,
        content: tweetText,
        ogImage: safeText(payload.thumbnail_url),
        favicon: 'https://abs.twimg.com/favicons/twitter.ico',
        domain: parsed.hostname,
        sourceType,
        sourceMetadata: {
          text: tweetText,
          authorName,
          authorHandle,
          tweetId: tweetMeta?.tweetId || tweetId || '',
          publishedAt: tweetMeta?.publishedAt || '',
          links: tweetMeta?.links || [],
          resolvedLinks: fxtwitterResult?.resolvedLinks ? Object.fromEntries(fxtwitterResult.resolvedLinks) : undefined,
          rawHtml: html,
          entities,
          fullTextFetched: !!fullTweetText,
          engagement: fxtwitterResult?.engagement,
          media: fxtwitterResult?.media
        }
      };
    }
    
    // If oEmbed fails but we have FxTwitter data, still return it
    if (fullTweetText) {
      return {
        title: createTweetTitle(fullTweetText),
        description: fullTweetText,
        content: fullTweetText,
        ogImage: null,
        favicon: 'https://abs.twimg.com/favicons/twitter.ico',
        domain: parsed.hostname,
        sourceType,
        sourceMetadata: {
          text: fullTweetText,
          authorName: fullTweetAuthor?.name || 'Unknown',
          authorHandle: fullTweetAuthor?.handle || '',
          tweetId: tweetId || '',
          publishedAt: '',
          links: [],
          resolvedLinks: fxtwitterResult?.resolvedLinks ? Object.fromEntries(fxtwitterResult.resolvedLinks) : undefined,
          rawHtml: '',
          entities: extractEntitiesFromTweet(fullTweetText),
          fullTextFetched: true,
          engagement: fxtwitterResult?.engagement,
          media: fxtwitterResult?.media
        }
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

  const readability = new Readability(new DOMParser().parseFromString(html, 'text/html'));
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
