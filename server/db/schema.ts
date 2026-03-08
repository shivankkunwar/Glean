import { relations } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const statusType = ['pending', 'processing', 'done', 'failed'] as const;
export const sourceType = ['youtube', 'twitter', 'article', 'github', 'generic', 'other'] as const;
export const jobType = ['fetch', 'embed', 'classify'] as const;
export const tagSourceType = ['manual', 'ai'] as const;

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

export const bookmarkRelations = relations(bookmarks, ({ one }) => ({
  category: one(categories, {
    fields: [bookmarks.categoryId],
    references: [categories.id]
  })
}));

export const categoryRelations = relations(categories, ({ many }) => ({
  bookmarks: many(bookmarks)
}));

export const jobRelations = relations(jobs, ({ one }) => ({
  bookmark: one(bookmarks, {
    fields: [jobs.bookmarkId],
    references: [bookmarks.id]
  })
}));

export const tagRelations = relations(tags, ({ one }) => ({
  bookmark: one(bookmarks, {
    fields: [tags.bookmarkId],
    references: [bookmarks.id]
  })
}));
