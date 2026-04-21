import { getDb } from '../utils/db';

export const SOURCE_TYPE_FILTERS = ['article', 'note', 'video', 'tweet', 'github', 'book', 'product'] as const;

export type SourceTypeFilter = (typeof SOURCE_TYPE_FILTERS)[number];

export function getValidatedSourceType(query: Record<string, unknown>): SourceTypeFilter | null {
  const raw = String(query.sourceType ?? '').trim().toLowerCase();
  return SOURCE_TYPE_FILTERS.includes(raw as SourceTypeFilter) ? (raw as SourceTypeFilter) : null;
}

function notePredicate(alias: string): string {
  return `(${alias}.source_type IN ('note', 'text') OR ${alias}.url IS NULL OR ${alias}.url LIKE 'https://note.local/%')`;
}

function videoPredicate(alias: string): string {
  return `(${alias}.source_type = 'youtube' OR ${alias}.url LIKE '%youtube.com%' OR ${alias}.url LIKE '%youtu.be%' OR ${alias}.url LIKE '%vimeo.com%')`;
}

function tweetPredicate(alias: string): string {
  return `(${alias}.source_type IN ('twitter', 'x') OR ${alias}.url LIKE '%twitter.com%' OR ${alias}.url LIKE '%x.com%')`;
}

function githubPredicate(alias: string): string {
  return `(${alias}.source_type = 'github' OR ${alias}.url LIKE '%github.com%')`;
}

function bookPredicate(alias: string): string {
  return `${alias}.source_type = 'book'`;
}

function productPredicate(alias: string): string {
  return `${alias}.source_type = 'product'`;
}

export function buildSourceTypePredicate(sourceType: SourceTypeFilter, alias: string = 'b'): string {
  const note = notePredicate(alias);
  const video = videoPredicate(alias);
  const tweet = tweetPredicate(alias);
  const github = githubPredicate(alias);
  const book = bookPredicate(alias);
  const product = productPredicate(alias);

  switch (sourceType) {
    case 'note':
      return note;
    case 'video':
      return video;
    case 'tweet':
      return tweet;
    case 'github':
      return github;
    case 'book':
      return book;
    case 'product':
      return product;
    case 'article':
      return `NOT (${note} OR ${video} OR ${tweet} OR ${github} OR ${book} OR ${product})`;
  }
}

export function filterBySourceType<T extends { bookmarkId: number }>(
  items: T[],
  sourceType: SourceTypeFilter
): T[] {
  if (items.length === 0) return items;

  const { client } = getDb();
  const ids = items.map((item) => item.bookmarkId);
  const placeholders = ids.map(() => '?').join(',');
  const predicate = buildSourceTypePredicate(sourceType, 'b');
  const matches = client
    .prepare(`SELECT b.id FROM bookmarks b WHERE b.id IN (${placeholders}) AND ${predicate}`)
    .all(...ids) as Array<{ id: number }>;

  const allowed = new Set(matches.map((row) => row.id));
  return items.filter((item) => allowed.has(item.bookmarkId));
}
