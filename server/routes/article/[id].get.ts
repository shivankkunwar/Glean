import { defineEventHandler, getRouterParam } from 'h3';
import { getDb } from '../../utils/db';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const { client } = getDb();

  const bookmark = client.prepare(`
    SELECT title, url, domain, description, content, source_type, source_metadata, created_at
    FROM bookmarks
    WHERE id = ?
  `).get(id) as any;

  if (!bookmark) {
    return 'Article not found';
  }

  let fullContent = bookmark.content || '';
  let meta: any = null;
  if (bookmark.source_metadata) {
    try {
      meta = JSON.parse(bookmark.source_metadata);
      // For Twitter/X Articles, source_metadata.text often has the full article content
      if ((bookmark.source_type === 'twitter' || bookmark.source_type === 'article') && meta.text) {
        fullContent = meta.text;
      }
      
      // For Reddit, we can reconstruct post + comments
      if (bookmark.source_type === 'reddit' && meta.postTitle) {
        fullContent = `${meta.postBody || ''}\n\n---\n\nComments:\n${(meta.topComments || []).map((c: any) => `${c.authorName}: ${c.body}`).join('\n\n')}`;
      }

      // For GitHub, meta.readme has the full readme
      if (bookmark.source_type === 'github' && meta.readme) {
        fullContent = meta.readme;
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Fallback to description if content is empty
  if (!fullContent && bookmark.description) {
    fullContent = bookmark.description;
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${bookmark.title || 'Untitled'}</title>
    <style>
        body {
            font-family: serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 40px auto;
            padding: 0 20px;
            background-color: #fff;
            color: #000;
        }
        header {
            border-bottom: 2px solid #000;
            padding-bottom: 20px;
            margin-bottom: 40px;
        }
        .meta {
            font-size: 0.9em;
            color: #444;
            margin-bottom: 10px;
        }
        h1 {
            font-size: 2em;
            margin: 10px 0;
            line-height: 1.2;
        }
        .content {
            font-size: 1.1em;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .back-link {
            display: inline-block;
            margin-bottom: 30px;
            text-decoration: none;
            color: #000;
            font-weight: bold;
        }
        .back-link::before {
            content: "← ";
        }
    </style>
</head>
<body>
    <a href="/article" class="back-link">Back to Library</a>
    <header>
        <div class="meta">${bookmark.domain} &bull; ${new Date(bookmark.created_at).toLocaleDateString()}</div>
        <h1>${bookmark.title || 'Untitled'}</h1>
    </header>
    <div class="content">
${fullContent}
    </div>
    <hr>
    <p><small>Source: <a href="${bookmark.url}">${bookmark.url}</a></small></p>
</body>
</html>
  `;

  return html;
});
