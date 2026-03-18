import { join } from 'node:path';
import { cwd } from 'node:process';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../db/schema';
import { DEFAULT_CATEGORIES } from './constants';

type DatabasePayload = {
  db: ReturnType<typeof drizzle>;
  client: Database;
};

const defaultPath = join(cwd(), 'glean.db');

let singleton: DatabasePayload | null = null;

function ensureColumn(client: Database, table: string, column: string, definition: string) {
  const row = client
    .prepare(`SELECT 1 FROM pragma_table_info('${table}') WHERE name = ? LIMIT 1`)
    .get(column) as { 1: number } | undefined;

  if (row) {
    return;
  }

  client.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
}

function ensureSchemaExtensions(client: Database) {
  ensureColumn(client, 'bookmarks', 'canonical_text', 'TEXT');
  ensureColumn(client, 'bookmarks', 'summary', 'TEXT');
  ensureColumn(client, 'bookmarks', 'quality_score', 'REAL');
  ensureColumn(client, 'bookmarks', 'embedding_version', 'TEXT');
  ensureColumn(client, 'bookmarks', 'classification_version', 'TEXT');
  ensureColumn(client, 'bookmarks', 'embed_model', 'TEXT');
  ensureColumn(client, 'bookmarks', 'classify_model', 'TEXT');
  ensureColumn(client, 'bookmarks', 'summary_model', 'TEXT');
  ensureColumn(client, 'bookmarks', 'artifact_policy_version', 'TEXT');
  ensureColumn(client, 'bookmarks', 'source_metadata', 'TEXT'); // JSON blob for source-specific metadata
  ensureColumn(client, 'bookmarks', 'is_pinned', 'INTEGER NOT NULL DEFAULT 0'); // Pinned bookmark flag

  client.exec(
    `
      CREATE TABLE IF NOT EXISTS bookmark_ai_artifacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bookmark_id INTEGER NOT NULL,
        kind TEXT NOT NULL,
        value_json TEXT NOT NULL,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        version TEXT DEFAULT 'v1',
        confidence REAL,
        skipped INTEGER NOT NULL DEFAULT 0,
        reason TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(bookmark_id) REFERENCES bookmarks(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_ai_artifacts_bookmark ON bookmark_ai_artifacts(bookmark_id);
      CREATE INDEX IF NOT EXISTS idx_ai_artifacts_kind ON bookmark_ai_artifacts(kind);

      -- Vector storage for semantic search
      CREATE TABLE IF NOT EXISTS bookmark_embeddings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bookmark_id INTEGER NOT NULL UNIQUE,
        embedding_version TEXT NOT NULL,
        model TEXT NOT NULL,
        dimension_count INTEGER NOT NULL,
        vector_blob BLOB NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(bookmark_id) REFERENCES bookmarks(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_embeddings_bookmark ON bookmark_embeddings(bookmark_id);
    `
  );

  // Rebuild FTS index to ensure schema is correct
  rebuildFtsIndex(client);
}

function rebuildFtsIndex(client: Database) {
  try {
    // Check if FTS table exists and has correct structure
    const tableInfo = client.prepare("PRAGMA table_info(bookmarks_fts)").all() as Array<{name: string}>;
    const columnNames = tableInfo.map(col => col.name);
    
    // If tags column is missing, we need to rebuild the FTS table properly
    if (!columnNames.includes('tags')) {
      // Get all existing FTS data
      const existingData = client.prepare(`
        SELECT b.id, b.title, b.description, b.content,
               COALESCE((SELECT group_concat(name, ' ') FROM tags WHERE bookmark_id = b.id), '') as tags
        FROM bookmarks b
        WHERE b.id IN (SELECT rowid FROM bookmarks_fts)
      `).all() as Array<{id: number; title: string | null; description: string | null; content: string | null; tags: string}>;

      // Drop old FTS table and triggers
      client.exec(`
        DROP TRIGGER IF EXISTS bookmarks_fts_ai;
        DROP TRIGGER IF EXISTS bookmarks_fts_ad;
        DROP TRIGGER IF EXISTS bookmarks_fts_au;
        DROP TABLE IF EXISTS bookmarks_fts;
      `);

      // Create new FTS table with correct schema including tags
      client.exec(`
        CREATE VIRTUAL TABLE bookmarks_fts USING fts5(
          title,
          tags,
          description,
          content,
          content='bookmarks',
          content_rowid='id',
          prefix='2 3'
        );
      `);

      // Create new triggers
      client.exec(`
        CREATE TRIGGER bookmarks_fts_ai AFTER INSERT ON bookmarks BEGIN
          INSERT INTO bookmarks_fts(rowid, title, tags, description, content)
          VALUES (
            new.id, 
            COALESCE(new.title, ''),
            COALESCE((SELECT group_concat(name, ' ') FROM tags WHERE bookmark_id = new.id), ''),
            COALESCE(new.description, ''),
            COALESCE(new.content, '')
          );
        END;

        CREATE TRIGGER bookmarks_fts_ad AFTER DELETE ON bookmarks BEGIN
          INSERT INTO bookmarks_fts(bookmarks_fts, rowid, title, tags, description, content)
          VALUES('delete', old.id, COALESCE(old.title, ''), '', COALESCE(old.description, ''), COALESCE(old.content, ''));
        END;

        CREATE TRIGGER bookmarks_fts_au AFTER UPDATE ON bookmarks BEGIN
          INSERT INTO bookmarks_fts(bookmarks_fts, rowid, title, tags, description, content)
          VALUES('delete', old.id, COALESCE(old.title, ''), '', COALESCE(old.description, ''), COALESCE(old.content, ''));
          INSERT INTO bookmarks_fts(rowid, title, tags, description, content)
          VALUES (
            new.id, 
            COALESCE(new.title, ''),
            COALESCE((SELECT group_concat(name, ' ') FROM tags WHERE bookmark_id = new.id), ''),
            COALESCE(new.description, ''),
            COALESCE(new.content, '')
          );
        END;
      `);

      // Reindex existing data
      for (const row of existingData) {
        client.prepare(`
          INSERT INTO bookmarks_fts(rowid, title, tags, description, content)
          VALUES (?, ?, ?, ?, ?)
        `).run(row.id, row.title || '', row.tags, row.description || '', row.content || '');
      }
    }
  } catch (e) {
    console.error('FTS rebuild error:', e);
  }
}

function bootstrapSchema(client: Database) {
  client.exec(
    `
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL DEFAULT '#f3f4f6',
        icon TEXT NOT NULL DEFAULT '📌',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bookmarks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        url_hash TEXT NOT NULL UNIQUE,
        title TEXT,
        description TEXT,
        content TEXT,
        og_image TEXT,
        favicon TEXT,
        domain TEXT,
        source_type TEXT NOT NULL DEFAULT 'generic',
        status TEXT NOT NULL DEFAULT 'pending',
        category_id INTEGER,
        ai_status TEXT DEFAULT 'pending',
        processed_at TEXT,
        failure_reason TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bookmark_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'manual',
        confidence REAL NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(bookmark_id) REFERENCES bookmarks(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        bookmark_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        payload TEXT,
        attempts INTEGER NOT NULL DEFAULT 0,
        error TEXT,
        next_run_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        locked_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(bookmark_id) REFERENCES bookmarks(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_bookmarks_status ON bookmarks(status);
      CREATE INDEX IF NOT EXISTS idx_bookmarks_category ON bookmarks(category_id);
      CREATE INDEX IF NOT EXISTS idx_jobs_bookmark_status ON jobs(bookmark_id, status);
      CREATE INDEX IF NOT EXISTS idx_tags_bookmark ON tags(bookmark_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_bookmark_name ON tags(bookmark_id, name);

      CREATE VIRTUAL TABLE IF NOT EXISTS bookmarks_fts USING fts5(
        title,
        tags,
        description,
        content,
        content='bookmarks',
        content_rowid='id',
        prefix='2 3'
      );

      CREATE TRIGGER IF NOT EXISTS bookmarks_fts_ai AFTER INSERT ON bookmarks BEGIN
        INSERT INTO bookmarks_fts(rowid, title, tags, description, content)
        VALUES (
          new.id, 
          COALESCE(new.title, ''),
          COALESCE((SELECT group_concat(name, ' ') FROM tags WHERE bookmark_id = new.id), ''),
          COALESCE(new.description, ''),
          COALESCE(new.content, '')
        );
      END;

      CREATE TRIGGER IF NOT EXISTS bookmarks_fts_ad AFTER DELETE ON bookmarks BEGIN
        INSERT INTO bookmarks_fts(bookmarks_fts, rowid, title, tags, description, content)
        VALUES('delete', old.id, COALESCE(old.title, ''), '', COALESCE(old.description, ''), COALESCE(old.content, ''));
      END;

      CREATE TRIGGER IF NOT EXISTS bookmarks_fts_au AFTER UPDATE ON bookmarks BEGIN
        INSERT INTO bookmarks_fts(bookmarks_fts, rowid, title, tags, description, content)
        VALUES('delete', old.id, COALESCE(old.title, ''), '', COALESCE(old.description, ''), COALESCE(old.content, ''));
        INSERT INTO bookmarks_fts(rowid, title, tags, description, content)
        VALUES (
          new.id, 
          COALESCE(new.title, ''),
          COALESCE((SELECT group_concat(name, ' ') FROM tags WHERE bookmark_id = new.id), ''),
          COALESCE(new.description, ''),
          COALESCE(new.content, '')
        );
      END;

      CREATE TRIGGER IF NOT EXISTS bookmarks_fts_ad AFTER DELETE ON bookmarks BEGIN
        INSERT INTO bookmarks_fts(bookmarks_fts, rowid, title, tags, description, content)
        VALUES('delete', old.id, COALESCE(old.title, ''), '', COALESCE(old.description, ''), COALESCE(old.content, ''));
      END;

      CREATE TRIGGER IF NOT EXISTS bookmarks_fts_au AFTER UPDATE ON bookmarks BEGIN
        INSERT INTO bookmarks_fts(bookmarks_fts, rowid, title, tags, description, content)
        VALUES('delete', old.id, COALESCE(old.title, ''), '', COALESCE(old.description, ''), COALESCE(old.content, ''));
        INSERT INTO bookmarks_fts(rowid, title, tags, description, content)
        VALUES (
          new.id, 
          COALESCE(new.title, ''),
          COALESCE((SELECT group_concat(name, ' ') FROM tags WHERE bookmark_id = new.id), ''),
          COALESCE(new.description, ''),
          COALESCE(new.content, '')
        );
      END;
    `
  );

  for (const cat of DEFAULT_CATEGORIES) {
    client
      .prepare(
        'INSERT OR IGNORE INTO categories(name, color, icon, created_at) VALUES(@name, @color, @icon, CURRENT_TIMESTAMP)'
      )
      .run(cat);
  }

  ensureSchemaExtensions(client);
}

export function getDb(): DatabasePayload {
  if (singleton) {
    return singleton;
  }

  const dbPath = process.env.DATABASE_PATH || defaultPath;
  const client = new Database(dbPath);

  client.pragma('journal_mode = WAL');
  client.pragma('busy_timeout = 5000');
  client.pragma('foreign_keys = ON');

  bootstrapSchema(client);

  singleton = {
    client,
    db: drizzle(client, {
      schema
    })
  };

  return singleton;
}


