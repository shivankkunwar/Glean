import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  color: text('color').notNull().default('#dbeafe'),
  icon: text('icon').notNull().default('🗂'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP')
});

export const bookmarks = sqliteTable(
  'bookmarks',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    url: text('url').notNull(),
    urlHash: text('url_hash').notNull().unique(),
    title: text('title'),
    description: text('description'),
    content: text('content'),
    ogImage: text('og_image'),
    favicon: text('favicon'),
    domain: text('domain'),
    sourceType: text('source_type').notNull().default('generic'),
    status: text('status').notNull().default('pending'),
    categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
    aiStatus: text('ai_status').default('pending'),
    canonicalText: text('canonical_text'),
    summary: text('summary'),
    qualityScore: real('quality_score'),
    embeddingVersion: text('embedding_version'),
    classificationVersion: text('classification_version'),
    embedModel: text('embed_model'),
    embedHash: text('embed_hash'),
    classifyModel: text('classify_model'),
    summaryModel: text('summary_model'),
    artifactPolicyVersion: text('artifact_policy_version'),
    processedAt: text('processed_at'),
    failureReason: text('failure_reason'),
    createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
    updatedAt: text('updated_at').notNull().default('CURRENT_TIMESTAMP')
  },
  (table) => [
    index('idx_bookmarks_status').on(table.status),
    index('idx_bookmarks_category').on(table.categoryId)
  ]
);

export const jobs = sqliteTable('jobs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type').notNull(),
  bookmarkId: integer('bookmark_id')
    .notNull()
    .references(() => bookmarks.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'),
  payload: text('payload'),
  attempts: integer('attempts').notNull().default(0),
  error: text('error'),
  nextRunAt: text('next_run_at').notNull().default('CURRENT_TIMESTAMP'),
  lockedAt: text('locked_at'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP')
});

export const tags = sqliteTable(
  'tags',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    bookmarkId: integer('bookmark_id')
      .notNull()
      .references(() => bookmarks.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    source: text('source').notNull().default('manual'),
    confidence: real('confidence').notNull().default(1),
    createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP')
  },
  (table) => [index('idx_tags_bookmark').on(table.bookmarkId)]
);

export const bookmarkAiArtifacts = sqliteTable(
  'bookmark_ai_artifacts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    bookmarkId: integer('bookmark_id')
      .notNull()
      .references(() => bookmarks.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    valueJson: text('value_json').notNull(),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    version: text('version').default('v1'),
    confidence: real('confidence'),
    skipped: integer('skipped').notNull().default(0),
    reason: text('reason'),
    createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP')
  },
  (table) => [index('idx_ai_artifacts_bookmark').on(table.bookmarkId), index('idx_ai_artifacts_kind').on(table.kind)]
);
