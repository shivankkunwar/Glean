import { getDb } from '../utils/db';

type KeywordSearchParams = {
  query: string;
  categoryId?: number;
  limit: number;
  offset: number;
};

type SearchResult = {
  id: number;
  url: string;
  title: string | null;
  description: string | null;
  ogImage: string | null;
  favicon: string | null;
  domain: string | null;
  status: string;
  createdAt: string;
  score: number;
  snippet: string | null;
  matchedColumn: string | null;
};

function mapRows(rows: Array<Record<string, unknown>>, scoreKey: 'rank' | 'score' = 'rank'): SearchResult[] {
  return rows.map((row) => ({
    id: Number(row.id),
    url: String(row.url),
    title: row.title ? String(row.title) : null,
    description: row.description ? String(row.description) : null,
    ogImage: row.og_image ? String(row.og_image) : null,
    favicon: row.favicon ? String(row.favicon) : null,
    domain: row.domain ? String(row.domain) : null,
    status: String(row.status),
    createdAt: String(row.created_at),
    score: Number(row[scoreKey] ?? 0),
    snippet: row.snippet ? String(row.snippet) : null,
    matchedColumn: row.matched_column ? String(row.matched_column) : null
  }));
}

/**
 * Normalize a user search query for FTS5
 * - Lowercase
 * - Remove problematic characters
 * - Add prefix matching for partial terms
 * - Handle multi-word queries
 */
function normalizeQuery(query: string): { ftsQuery: string; hasQuotes: boolean } {
  const trimmed = query.trim();
  if (!trimmed) {
    return { ftsQuery: '', hasQuotes: false };
  }

  // Check for quoted phrases
  const hasQuotes = trimmed.includes('"');
  
  if (hasQuotes) {
    // Keep quoted phrases intact, process the rest
    // Remove single quotes but keep double quotes for phrase matching
    const cleaned = trimmed.replace(/'/g, '');
    return { ftsQuery: cleaned.toLowerCase(), hasQuotes: true };
  }

  // Clean and normalize
  let cleaned = trimmed
    .toLowerCase()
    .replace(/[^\w\s\-]/g, ' ')  // Remove punctuation except hyphens
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return { ftsQuery: '', hasQuotes: false };
  }

  const words = cleaned.split(/\s+/);
  
  if (words.length === 1) {
    // Single word: add prefix matching
    return { ftsQuery: `${words[0]}*`, hasQuotes: false };
  }
  
  if (words.length === 2) {
    // Two words: try both AND and prefix matching
    // Format: "word1 word2" OR "word1* word2*"
    return { ftsQuery: `${words[0]} ${words[1]}`, hasQuotes: false };
  }
  
  // Multiple words: join with AND operator for FTS5
  // Also add prefix matching for the last word
  const lastWord = words[words.length - 1];
  words[words.length - 1] = `${lastWord}*`;
  
  return { ftsQuery: words.join(' '), hasQuotes: false };
}

/**
 * Build FTS query with fallback strategies
 */
function buildFtsQuery(query: string): string {
  const { ftsQuery, hasQuotes } = normalizeQuery(query);
  
  if (!ftsQuery) {
    return '';
  }
  
  if (hasQuotes) {
    // User explicitly quoted something, respect it
    return ftsQuery;
  }
  
  return ftsQuery;
}

/**
 * Try different query strategies for better results
 */
function trySearchStrategies(
  client: ReturnType<typeof getDb>['client'],
  query: string,
  categoryId: number | undefined,
  limit: number,
  offset: number
): { items: SearchResult[]; total: number; strategy: string } {
  const strategies = [
    // Strategy 1: Direct query with prefix matching
    () => {
      const ftsQuery = buildFtsQuery(query);
      if (!ftsQuery) return null;
      
      const where = categoryId ? ' AND b.category_id = @categoryId ' : '';
      const results = client
        .prepare(
          `SELECT
            b.id,
            b.url,
            b.title,
            b.description,
            b.og_image,
            b.favicon,
            b.domain,
            b.status,
            b.created_at,
            bm25(bookmarks_fts) AS rank
           FROM bookmarks_fts
           JOIN bookmarks b ON b.id = bookmarks_fts.rowid
           WHERE bookmarks_fts MATCH @query${where}
           ORDER BY rank
           LIMIT @limit OFFSET @offset`
        )
        .all({ query: ftsQuery, categoryId, limit, offset }) as Array<Record<string, unknown>>;
      
      return { results, strategy: 'prefix' };
    },
    
    // Strategy 2: AND-based query for multi-word
    () => {
      const words = query.toLowerCase().trim().split(/\s+/).filter(w => w.length > 1);
      if (words.length < 2) return null;
      
      const andQuery = words.join(' AND ');
      const where = categoryId ? ' AND b.category_id = @categoryId ' : '';
      
      const results = client
        .prepare(
          `SELECT
            b.id,
            b.url,
            b.title,
            b.description,
            b.og_image,
            b.favicon,
            b.domain,
            b.status,
            b.created_at,
            bm25(bookmarks_fts) AS rank
           FROM bookmarks_fts
           JOIN bookmarks b ON b.id = bookmarks_fts.rowid
           WHERE bookmarks_fts MATCH @query${where}
           ORDER BY rank
           LIMIT @limit OFFSET @offset`
        )
        .all({ query: andQuery, categoryId, limit, offset }) as Array<Record<string, unknown>>;
      
      return { results, strategy: 'and' };
    },
    
    // Strategy 3: OR-based query for partial matching
    () => {
      const words = query.toLowerCase().trim().split(/\s+/).filter(w => w.length > 1);
      if (words.length < 2) return null;
      
      const orQuery = words.join(' OR ');
      const where = categoryId ? ' AND b.category_id = @categoryId ' : '';
      
      const results = client
        .prepare(
          `SELECT
            b.id,
            b.url,
            b.title,
            b.description,
            b.og_image,
            b.favicon,
            b.domain,
            b.status,
            b.created_at,
            bm25(bookmarks_fts) AS rank
           FROM bookmarks_fts
           JOIN bookmarks b ON b.id = bookmarks_fts.rowid
           WHERE bookmarks_fts MATCH @query${where}
           ORDER BY rank
           LIMIT @limit OFFSET @offset`
        )
        .all({ query: orQuery, categoryId, limit, offset }) as Array<Record<string, unknown>>;
      
      return { results, strategy: 'or' };
    }
  ];

  // Try each strategy in order
  for (const tryStrategy of strategies) {
    const result = tryStrategy();
    if (result && result.results.length > 0) {
      const items = mapRows(result.results);

      // Get total count
      const where = categoryId ? ' AND b.category_id = @categoryId ' : '';
      const strategyQuery = result.strategy === 'prefix' 
        ? buildFtsQuery(query)
        : result.strategy === 'and'
          ? query.toLowerCase().trim().split(/\s+/).filter(w => w.length > 1).join(' AND ')
          : query.toLowerCase().trim().split(/\s+/).filter(w => w.length > 1).join(' OR ');
      
      const totalRow = (client
        .prepare(
          `SELECT COUNT(*) AS total
           FROM bookmarks_fts
           JOIN bookmarks b ON b.id = bookmarks_fts.rowid
           WHERE bookmarks_fts MATCH @query${where}`
        )
        .get({ query: strategyQuery, categoryId }) as { total: number }) ?? { total: 0 };

      return { items, total: Number(totalRow.total), strategy: result.strategy };
    }
  }

  const likeNeedle = `%${query.trim().toLowerCase()}%`;
  const metadataWhere = categoryId ? ' AND b.category_id = @categoryId ' : '';
  const metadataResults = client
    .prepare(
      `SELECT
        b.id,
        b.url,
        b.title,
        b.description,
        b.og_image,
        b.favicon,
        b.domain,
        b.status,
        b.created_at,
        CASE
          WHEN lower(COALESCE(b.source_metadata, '')) LIKE @likeQuery THEN 0.25
          WHEN lower(COALESCE(b.domain, '')) LIKE @likeQuery THEN 0.5
          WHEN lower(COALESCE(b.url, '')) LIKE @likeQuery THEN 0.75
          ELSE 1
        END AS score,
        COALESCE(
          CASE 
            WHEN lower(COALESCE(b.description, '')) LIKE @likeQuery THEN substr(b.description, instr(lower(b.description), lower(@rawQuery)) - 20, 60)
            WHEN lower(COALESCE(b.title, '')) LIKE @likeQuery THEN b.title
            ELSE substr(COALESCE(b.description, b.title, ''), 1, 100)
          END,
          'No preview available'
        ) AS snippet,
        CASE 
          WHEN lower(COALESCE(b.domain, '')) LIKE @likeQuery THEN 'domain'
          WHEN lower(COALESCE(b.source_metadata, '')) LIKE @likeQuery THEN 'metadata'
          WHEN lower(COALESCE(b.url, '')) LIKE @likeQuery THEN 'url'
          ELSE 'unknown'
        END AS matched_column
       FROM bookmarks b
       WHERE (
         lower(COALESCE(b.source_metadata, '')) LIKE @likeQuery OR
         lower(COALESCE(b.domain, '')) LIKE @likeQuery OR
         lower(COALESCE(b.url, '')) LIKE @likeQuery
       )${metadataWhere}
       ORDER BY score ASC, b.created_at DESC
       LIMIT @limit OFFSET @offset`
    )
    .all({ likeQuery: likeNeedle, rawQuery: query.trim().toLowerCase(), categoryId, limit, offset }) as Array<Record<string, unknown>>;

  if (metadataResults.length > 0) {
    const totalRow = (client
      .prepare(
        `SELECT COUNT(*) AS total
         FROM bookmarks b
         WHERE (
           lower(COALESCE(b.source_metadata, '')) LIKE @likeQuery OR
           lower(COALESCE(b.domain, '')) LIKE @likeQuery OR
           lower(COALESCE(b.url, '')) LIKE @likeQuery
         )${metadataWhere}`
      )
      .get({ likeQuery: likeNeedle, categoryId }) as { total: number }) ?? { total: 0 };

    return {
      items: mapRows(metadataResults, 'score'),
      total: Number(totalRow.total),
      strategy: 'metadata'
    };
  }

  // No results found
  return { items: [], total: 0, strategy: 'none' };
}

export function executeKeywordSearch(params: KeywordSearchParams): { items: SearchResult[]; total: number; strategy?: string } {
  const { client } = getDb();
  
  // Use the multi-strategy search
  const result = trySearchStrategies(
    client,
    params.query,
    params.categoryId,
    params.limit,
    params.offset
  );
  
  return result;
}

export function filterByCategoryId<T extends { bookmarkId: number }>(
  items: T[],
  categoryId: number
): T[] {
  if (items.length === 0) return items;
  
  const { client } = getDb();
  const ids = items.map((r) => r.bookmarkId);
  const placeholders = ids.map(() => '?').join(',');
  const categoryMatches = client
    .prepare(`SELECT id FROM bookmarks WHERE id IN (${placeholders}) AND category_id = ?`)
    .all([...ids, categoryId]) as Array<{ id: number }>;
  const categoryIds = new Set(categoryMatches.map((r) => r.id));
  return items.filter((r) => categoryIds.has(r.bookmarkId));
}

/**
 * Build a search text from bookmark data for FTS indexing
 * This combines title, description, content, summary, tags, and entities
 */
export function buildSearchText(data: {
  title?: string | null;
  description?: string | null;
  content?: string | null;
  summary?: string | null;
  tags?: string[];
  domain?: string | null;
  sourceMetadata?: string | null;
}): string {
  const parts: string[] = [];
  
  // Add title with higher weight (repeat it)
  if (data.title) {
    parts.push(data.title);
    parts.push(data.title); // Double weight for title
  }
  
  // Add description
  if (data.description) {
    parts.push(data.description);
  }
  
  // Add content (but limit length)
  if (data.content) {
    parts.push(data.content.slice(0, 2000));
  }
  
  // Add summary if available
  if (data.summary) {
    parts.push(data.summary);
  }
  
  // Add tags with higher weight
  if (data.tags && data.tags.length > 0) {
    parts.push(data.tags.join(' '));
    parts.push(data.tags.join(' ')); // Double weight for tags
  }
  
  // Extract entities from source metadata if available
  if (data.sourceMetadata) {
    try {
      const metadata = JSON.parse(data.sourceMetadata) as {
        entities?: string[];
        links?: string[];
        listedItems?: string[];
      };
      
      if (metadata.entities && metadata.entities.length > 0) {
        parts.push(metadata.entities.join(' '));
      }
      
      if (metadata.listedItems && metadata.listedItems.length > 0) {
        parts.push(metadata.listedItems.join(' '));
      }
    } catch {
      // Ignore parse errors
    }
  }
  
  return parts.join('\n\n');
}
