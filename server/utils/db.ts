import { join } from 'node:path';
import { cwd } from 'node:process';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sql } from 'drizzle-orm';
import * as schema from '../db/schema';

type DatabasePayload = {
  db: ReturnType<typeof drizzle>;
  client: Database;
};

const defaultPath = join(cwd(), 'glean.db');
const DEFAULT_CATEGORIES = [
  { name: 'Uncategorized', color: '#f3f4f6', icon: '📌' },
  { name: 'Inspiration', color: '#fee2e2', icon: '✨' },
  { name: 'Watch Later', color: '#dbeafe', icon: '🎬' },
  { name: 'Read Later', color: '#dcfce7', icon: '📚' },
  { name: 'Tools', color: '#ede9fe', icon: '🧰' }
];

let singleton: DatabasePayload | null = null;

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
        description,
        content,
        content='bookmarks',
        content_rowid='id'
      );

      CREATE TRIGGER IF NOT EXISTS bookmarks_fts_ai AFTER INSERT ON bookmarks BEGIN
        INSERT INTO bookmarks_fts(rowid, title, description, content)
        VALUES (new.id, new.title, new.description, new.content);
      END;

      CREATE TRIGGER IF NOT EXISTS bookmarks_fts_ad AFTER DELETE ON bookmarks BEGIN
        DELETE FROM bookmarks_fts WHERE rowid = old.id;
      END;

      CREATE TRIGGER IF NOT EXISTS bookmarks_fts_au AFTER UPDATE ON bookmarks BEGIN
        UPDATE bookmarks_fts
        SET title = new.title,
            description = new.description,
            content = new.content
        WHERE rowid = new.id;
      END;
    `
  );

  for (const category of DEFAULT_CATEGORIES) {
    const stmt = client.prepare(
      'INSERT OR IGNORE INTO categories(name, color, icon, created_at) VALUES(@name, @color, @icon, CURRENT_TIMESTAMP)'
    );
    stmt.run(category);
  }
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

export function touchUpdateAt(bookmarkId: number) {
  const { client } = getDb();
  client.prepare('UPDATE bookmarks SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(bookmarkId);
}

export function getDatabasePath(): string {
  return process.env.DATABASE_PATH || defaultPath;
}
