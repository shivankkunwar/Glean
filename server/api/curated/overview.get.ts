import { getDb } from '../../utils/db';
import type {
  CuratedBookmark,
  CuratedTheme,
  CuratedThread,
  WeeklyBrief,
  CuratedOverviewResponse,
} from '../../../app/types/curated';

function toCuratedBookmark(row: Record<string, unknown>): CuratedBookmark {
  return {
    id: Number(row.id),
    url: String(row.url),
    title: row.title ? String(row.title) : null,
    description: row.description ? String(row.description) : null,
    summary: row.summary ? String(row.summary) : null,
    ogImage: row.og_image ? String(row.og_image) : null,
    favicon: row.favicon ? String(row.favicon) : null,
    domain: row.domain ? String(row.domain) : null,
    sourceType: row.source_type ? String(row.source_type) : null,
    createdAt: String(row.created_at),
    isPinned: row.is_pinned === 1,
  };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = a[i]!;
    a[i] = a[j]!;
    a[j] = temp;
  }
  return a;
}

function cleanTagName(raw: string): string | null {
  let s = raw.replace(/[-_]/g, ' ').trim();
  if (s.length < 2) return null;
  if (/^\d+$/.test(s)) return null;
  if (s.length > 40) s = s.slice(0, 37) + '…';
  return s
    .split(' ')
    .map((w) => (w.length > 2 ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function cleanDomainName(raw: string): string | null {
  let s = raw.replace(/^www\./, '').trim();
  if (s.length < 2) return null;
  if (s.length > 40) s = s.slice(0, 37) + '…';
  return s;
}

export default defineEventHandler(async (_event): Promise<CuratedOverviewResponse> => {
  const { client } = getDb();

  // ── 1. Fetch bookmark data ────────────────────────────────────────────
  const pinnedRows = client
    .prepare(`
      SELECT id, url, title, description, summary,
        og_image, favicon, domain, source_type, created_at, is_pinned
      FROM bookmarks WHERE is_pinned = 1
      ORDER BY updated_at DESC LIMIT 5
    `)
    .all() as Array<Record<string, unknown>>;

  const olderRows = client
    .prepare(`
      SELECT id, url, title, description, summary,
        og_image, favicon, domain, source_type, created_at, is_pinned
      FROM bookmarks WHERE status = 'done' AND is_pinned = 0
      ORDER BY created_at ASC LIMIT 60
    `)
    .all() as Array<Record<string, unknown>>;

  const recentRows = client
    .prepare(`
      SELECT id, url, title, description, summary,
        og_image, favicon, domain, source_type, created_at, is_pinned
      FROM bookmarks WHERE status = 'done'
      ORDER BY created_at DESC LIMIT 60
    `)
    .all() as Array<Record<string, unknown>>;

  // Build bookmark ID set and lookup map
  const allBookmarkIds = new Set<number>();
  const bookmarkMap = new Map<number, Record<string, unknown>>();

  for (const rows of [pinnedRows, olderRows, recentRows]) {
    for (const row of rows) {
      const id = Number(row.id);
      allBookmarkIds.add(id);
      bookmarkMap.set(id, row);
    }
  }

  // ── 2. Fetch tags scoped to relevant bookmarks ────────────────────────
  const idList = Array.from(allBookmarkIds).join(',');
  const tagRows = idList.length
    ? (client
        .prepare(`SELECT id, bookmark_id, name FROM tags WHERE bookmark_id IN (${idList})`)
        .all() as Array<{ id: number; bookmark_id: number; name: string }>)
    : [];

  const tagMap = new Map<number, Array<{ id: number; name: string }>>();
  for (const t of tagRows) {
    const list = tagMap.get(t.bookmark_id) || [];
    list.push({ id: t.id, name: t.name });
    tagMap.set(t.bookmark_id, list);
  }

  const attachTags = (row: Record<string, unknown>): CuratedBookmark => ({
    ...toCuratedBookmark(row),
    tags: tagMap.get(Number(row.id)) || [],
  });

  // ── 3. Top of Mind ───────────────────────────────────────────────────
  const topOfMind = pinnedRows.map(attachTags);

  // ── 4. Rediscover ────────────────────────────────────────────────────
  const rediscover = shuffle(olderRows).slice(0, 3).map(attachTags);

  // ── 5. Radar ─────────────────────────────────────────────────────────
  const recentIds = new Set(recentRows.map((r) => Number(r.id)));

  const tagFreq = new Map<string, number>();
  const tagBookmarkIds = new Map<string, Set<number>>();
  for (const t of tagRows) {
    if (!recentIds.has(t.bookmark_id)) continue;
    const clean = cleanTagName(t.name);
    if (!clean) continue;
    tagFreq.set(clean, (tagFreq.get(clean) || 0) + 1);
    const ids = tagBookmarkIds.get(clean) || new Set<number>();
    ids.add(t.bookmark_id);
    tagBookmarkIds.set(clean, ids);
  }

  let radarThemes: CuratedTheme[] = Array.from(tagFreq.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count]) => {
      const ids = Array.from(tagBookmarkIds.get(name) || new Set<number>()).slice(0, 3);
      const items = ids.map((id) => attachTags(bookmarkMap.get(id)!));
      return {
        id: `tag-${name}`,
        title: name,
        subtitle: 'Saved from multiple angles recently.',
        itemCount: count,
        items,
      };
    });

  // Fallback to domain-based groups
  if (radarThemes.length === 0) {
    const domainFreq = new Map<string, number>();
    const domainBookmarkIds = new Map<string, Set<number>>();
    for (const row of recentRows) {
      const rawDomain = String(row.domain || '');
      const clean = cleanDomainName(rawDomain);
      if (!clean) continue;
      domainFreq.set(clean, (domainFreq.get(clean) || 0) + 1);
      const ids = domainBookmarkIds.get(clean) || new Set<number>();
      ids.add(Number(row.id));
      domainBookmarkIds.set(clean, ids);
    }
    radarThemes = Array.from(domainFreq.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, count]) => {
        const ids = Array.from(domainBookmarkIds.get(name) || new Set<number>()).slice(0, 3);
        const items = ids.map((id) => attachTags(bookmarkMap.get(id)!));
        return {
          id: `domain-${name}`,
          title: name,
          subtitle: 'Saved from multiple angles recently.',
          itemCount: count,
          items,
        };
      });
  }

  // ── 6. Threads ───────────────────────────────────────────────────────
  const threads: CuratedThread[] = [];

  const articleLike = recentRows.filter((r) => {
    const st = String(r.source_type || '').toLowerCase();
    return st === 'article' || st === 'pdf' || st === 'book';
  });
  if (articleLike.length >= 3) {
    threads.push({
      id: 'thread-read-this-soon',
      title: 'Read This Soon',
      description: 'Articles and long-form pieces waiting for your attention.',
      kind: 'reading' as const,
      itemCount: Math.min(articleLike.length, 6),
      items: articleLike.slice(0, 6).map(attachTags),
    });
  }

  const topRadarTag = radarThemes[0]?.title;
  if (topRadarTag) {
    const researchIds = Array.from(tagBookmarkIds.get(topRadarTag) || new Set<number>());
    const researchItems = researchIds
      .map((id) => bookmarkMap.get(id))
      .filter((r): r is Record<string, unknown> => !!r && !!(r.summary || r.description))
      .slice(0, 6);
    if (researchItems.length >= 3) {
      threads.push({
        id: 'thread-research-cluster',
        title: 'Research Cluster',
        description: `Items connected by "${topRadarTag}" that seem to form a line of thought.`,
        kind: 'research' as const,
        itemCount: researchItems.length,
        items: researchItems.map(attachTags),
      });
    }
  }

  const visualItems = recentRows.filter((r) => {
    const st = String(r.source_type || '').toLowerCase();
    return r.og_image && (st === 'product' || st === 'image' || st === 'design');
  });
  if (visualItems.length >= 3) {
    threads.push({
      id: 'thread-visual-moodboard',
      title: 'Visual Moodboard',
      description: 'Image-heavy saves that feel like a collection.',
      kind: 'visual' as const,
      itemCount: Math.min(visualItems.length, 6),
      items: visualItems.slice(0, 6).map(attachTags),
    });
  }

  const productItems = recentRows.filter((r) => {
    const st = String(r.source_type || '').toLowerCase();
    return st === 'product';
  });
  if (productItems.length >= 3) {
    threads.push({
      id: 'thread-products-to-reconsider',
      title: 'Products To Reconsider',
      description: 'Items you saved that might deserve a second look.',
      kind: 'products' as const,
      itemCount: Math.min(productItems.length, 6),
      items: productItems.slice(0, 6).map(attachTags),
    });
  }

  const finalThreads = threads.slice(0, 4);

  // ── 7. Weekly Brief ──────────────────────────────────────────────────
  const briefCandidates = recentRows
    .filter((r) => r.summary || r.description)
    .slice(0, 12);

  let weeklyBrief: WeeklyBrief | null = null;
  if (briefCandidates.length >= 5) {
    const domains = new Set(
      briefCandidates
        .map((r) => cleanDomainName(String(r.domain || '')))
        .filter((d): d is string => Boolean(d))
    );
    const sourceTypes = new Set(briefCandidates.map((r) => String(r.source_type || '')).filter(Boolean));
    const briefCandidateIds = new Set(briefCandidates.map((r) => Number(r.id)));
    const briefTags = new Set<string>();
    for (const t of tagRows) {
      if (briefCandidateIds.has(t.bookmark_id)) {
        const clean = cleanTagName(t.name);
        if (clean) briefTags.add(clean);
      }
    }

    const tagList = Array.from(briefTags).slice(0, 3);
    const domainList = Array.from(domains).slice(0, 3);
    const typeList = Array.from(sourceTypes).slice(0, 3);

    let summary = 'This week you saved a mix of ';
    summary += typeList.length > 0 ? typeList.join(', ') : 'content';
    summary += ' from ';
    summary += domainList.length > 0 ? domainList.join(', ') : 'various sources';
    summary += '.';
    if (tagList.length > 0) {
      summary += ` Recurring themes include ${tagList.join(', ')}.`;
    }

    const bullets: string[] = [];
    if (domainList.length > 0) {
      bullets.push(`Most saves came from ${domainList[0]}.`);
    }
    if (typeList.length > 0) {
      bullets.push(`${typeList.length} different content types in your recent saves.`);
    }
    if (tagList.length > 0) {
      bullets.push(`Top emerging theme: ${tagList[0]}.`);
    }

    weeklyBrief = {
      title: 'This week in your vault',
      dek: 'A compact view of the ideas and materials you saved recently.',
      summary,
      bullets: bullets.slice(0, 3),
      question: 'Which of these threads deserves deeper attention next?',
      items: briefCandidates.slice(0, 3).map(attachTags),
    };
  }

  return {
    topOfMind,
    radar: radarThemes,
    threads: finalThreads,
    weeklyBrief,
    rediscover,
  };
});
