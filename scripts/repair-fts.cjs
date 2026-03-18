const Database = require('better-sqlite3');

const db = new Database('glean.db');

const sql = [
  'DROP TRIGGER IF EXISTS bookmarks_fts_ai;',
  'DROP TRIGGER IF EXISTS bookmarks_fts_ad;',
  'DROP TRIGGER IF EXISTS bookmarks_fts_au;',
  'DROP TABLE IF EXISTS bookmarks_fts;',
  "CREATE VIRTUAL TABLE bookmarks_fts USING fts5(title, description, content, content='bookmarks', content_rowid='id');",
  'INSERT INTO bookmarks_fts(rowid, title, description, content) SELECT id, title, description, content FROM bookmarks;',
  `CREATE TRIGGER bookmarks_fts_ai AFTER INSERT ON bookmarks BEGIN
     INSERT INTO bookmarks_fts(rowid, title, description, content)
     VALUES (new.id, new.title, new.description, new.content);
   END;`,
  `CREATE TRIGGER bookmarks_fts_ad AFTER DELETE ON bookmarks BEGIN
     INSERT INTO bookmarks_fts(bookmarks_fts, rowid, title, description, content)
     VALUES('delete', old.id, old.title, old.description, old.content);
   END;`,
  `CREATE TRIGGER bookmarks_fts_au AFTER UPDATE ON bookmarks BEGIN
     INSERT INTO bookmarks_fts(bookmarks_fts, rowid, title, description, content)
     VALUES('delete', old.id, old.title, old.description, old.content);
     INSERT INTO bookmarks_fts(rowid, title, description, content)
     VALUES (new.id, new.title, new.description, new.content);
   END;`
].join('\n');

db.exec(sql);
console.log('FTS repaired');
