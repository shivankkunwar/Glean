import { defineEventHandler } from 'h3';
import { getDb } from '../../utils/db';

export default defineEventHandler(async (event) => {
  const { client } = getDb();
  
  // Fetch all bookmarks that have substantial content to read
  const rows = client.prepare(`
    SELECT id, title, domain, source_type, created_at 
    FROM bookmarks 
    WHERE status = 'done'
      AND source_type != 'youtube'
      AND content IS NOT NULL
      AND length(content) > 500
    ORDER BY created_at DESC
  `).all() as any[];

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Glean Articles</title>
    <style>
        body {
            font-family: serif;
            line-height: 1.5;
            max-width: 800px;
            margin: 20px auto;
            padding: 0 20px;
            background-color: #fff;
            color: #000;
        }
        h1 {
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
        }
        ul {
            list-style: none;
            padding: 0;
        }
        li {
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 1px solid #ccc;
        }
        a {
            color: #000;
            text-decoration: underline;
            font-size: 1.2em;
            font-weight: bold;
        }
        .meta {
            font-size: 0.9em;
            color: #444;
            margin-top: 5px;
        }
        .kind {
            text-transform: uppercase;
            font-size: 0.8em;
            background: #eee;
            padding: 2px 5px;
            margin-right: 5px;
        }
    </style>
</head>
<body>
    <h1>Library</h1>
    <ul>
        ${rows.map(row => `
            <li>
                <a href="/article/${row.id}">${row.title || 'Untitled'}</a>
                <div class="meta">
                    <span class="kind">${row.source_type}</span>
                    ${row.domain} &bull; ${new Date(row.created_at).toLocaleDateString()}
                </div>
            </li>
        `).join('')}
    </ul>
</body>
</html>
  `;

  return html;
});
