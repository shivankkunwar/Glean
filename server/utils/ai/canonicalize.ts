import type { CanonicalDocument, CanonicalSourceType } from './types';

function cleanText(input: string | null | undefined, maxLength: number): string | undefined {
  if (!input || !input.trim()) {
    return undefined;
  }

  const normalized = input
    .replace(/\s+/g, ' ')
    .replace(/[\u0000-\u001f]+/g, ' ')
    .trim();

  if (!normalized) {
    return undefined;
  }

  return normalized.length <= maxLength ? normalized : normalized.slice(0, maxLength);
}

function estimateTokens(input: string): number {
  const normalizedLength = Math.max(0, input.length);
  return Math.max(1, Math.ceil(normalizedLength / 4));
}

type CanonicalizeInput = {
  title?: string | null;
  sourceType?: CanonicalSourceType | null;
  domain?: string | null;
  authorOrChannel?: string | null;
  description?: string | null;
  content?: string | null;
  excerpt?: string | null;
  url: string;
  sourceMetadata?: Record<string, unknown>;
};

export function buildCanonicalDocument(input: CanonicalizeInput): CanonicalDocument {
  const title = cleanText(input.title ?? undefined, 220);
  const description = cleanText(input.description ?? undefined, 700);
  const excerpt = cleanText(input.excerpt ?? input.content ?? undefined, 900);
  const sourceType = (input.sourceType ?? 'generic') as CanonicalSourceType;

  // Extract structured metadata for specific source types
  let structured: CanonicalDocument['structured'] = undefined;
  
  if (sourceType === 'twitter' && input.sourceMetadata) {
    const meta = input.sourceMetadata;
    structured = {
      tweetText: typeof meta.text === 'string' ? meta.text : undefined,
      author: typeof meta.authorName === 'string' ? meta.authorName : undefined,
      handle: typeof meta.authorHandle === 'string' ? meta.authorHandle : undefined,
      links: Array.isArray(meta.links) ? meta.links : undefined,
      listedItems: Array.isArray(meta.entities) ? (meta.entities as string[]) : undefined,
      resolvedLinks: typeof meta.resolvedLinks === 'object' ? meta.resolvedLinks : undefined,
      engagement: typeof meta.engagement === 'object' ? meta.engagement : undefined,
      media: typeof meta.media === 'object' ? meta.media : undefined,
      thread: Array.isArray(meta.thread) ? meta.thread : undefined,
      quotedTweet: typeof meta.quotedTweet === 'object' ? meta.quotedTweet : undefined
    };
    
    // Use the tweet text as the primary excerpt if available
    if (structured.tweetText && !excerpt) {
      // excerpt is already set above, but we could prioritize tweet text
    }
  }

  // Build source-aware canonical text
  let canonicalTextParts: string[] = [];
  
  if (title) {
    canonicalTextParts.push(`TITLE: ${title}`);
  }
  
  if (sourceType === 'twitter' && structured) {
    // For tweets, use structured format
    if (structured.author && structured.handle) {
      canonicalTextParts.push(`AUTHOR: ${structured.author} (@${structured.handle})`);
    } else if (structured.author) {
      canonicalTextParts.push(`AUTHOR: ${structured.author}`);
    }
    
    if (structured.tweetText) {
      canonicalTextParts.push(`CONTENT:\n${structured.tweetText}`);
    }
    
    // Include quoted tweet if present
    if (structured.quotedTweet?.text) {
      const quotedAuthor = structured.quotedTweet.author?.name || 'Unknown';
      canonicalTextParts.push(`QUOTED TWEET BY ${quotedAuthor}:\n${structured.quotedTweet.text}`);
    }
    
    if (structured.listedItems && structured.listedItems.length > 0) {
      canonicalTextParts.push(`REFERENCES:\n${structured.listedItems.join('\n')}`);
    }
    
    if (structured.links && structured.links.length > 0) {
      canonicalTextParts.push(`LINKS:\n${structured.links.slice(0, 5).join('\n')}`);
    }
    
    // Include resolved links if different from original
    if (structured.resolvedLinks && Object.keys(structured.resolvedLinks).length > 0) {
      const resolved = Object.entries(structured.resolvedLinks)
        .filter(([original, resolved]) => original !== resolved)
        .slice(0, 5);
      if (resolved.length > 0) {
        canonicalTextParts.push(`RESOLVED LINKS:\n${resolved.map(([orig, res]) => `${orig} → ${res}`).join('\n')}`);
      }
    }
  } else {
    // For other sources, use standard format
    if (description) {
      canonicalTextParts.push(`DESCRIPTION: ${description}`);
    }
    if (excerpt) {
      canonicalTextParts.push(`CONTENT: ${excerpt}`);
    }
  }
  
  if (input.domain) {
    canonicalTextParts.push(`DOMAIN: ${input.domain}`);
  }
  
  canonicalTextParts.push(`URL: ${input.url}`);
  
  const canonicalText = canonicalTextParts.join('\n\n');

  return {
    title,
    sourceType,
    domain: cleanText(input.domain ?? undefined, 200),
    authorOrChannel: cleanText(input.authorOrChannel ?? undefined, 140),
    description,
    excerpt,
    url: input.url,
    canonicalText,
    structured,
    tokenEstimate: estimateTokens(canonicalText)
  };
}
