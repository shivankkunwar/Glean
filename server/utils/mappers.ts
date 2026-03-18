export type BookmarkRow = {
  id: number;
  url: string;
  title: string | null;
  description: string | null;
  content: string | null;
  og_image: string | null;
  favicon: string | null;
  domain: string | null;
  source_type: string | null;
  status: string;
  ai_status: string | null;
  summary: string | null;
  category_id: number | null;
  category_name?: string | null;
  category_color?: string | null;
  category_icon?: string | null;
  created_at: string;
  updated_at?: string;
};

export type TagRow = {
  id: number;
  name: string;
  source: string;
  confidence: number;
  bookmark_id?: number;
};

export type BookmarkResponse = {
  id: number;
  url: string;
  title: string | null;
  description: string | null;
  content?: string | null;
  ogImage: string | null;
  favicon: string | null;
  domain: string | null;
  sourceType?: string | null;
  status: string;
  aiStatus?: string | null;
  summary?: string | null;
  categoryId?: number | null;
  category: { id: number; name: string; color: string; icon: string } | null;
  tags?: Array<{ id: number; name: string; source: string; confidence: number }>;
  createdAt: string;
  updatedAt?: string;
};

export function mapBookmarkRow(
  row: BookmarkRow,
  tags?: Array<{ id: number; name: string; source: string; confidence: number }>
): BookmarkResponse {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    description: row.description,
    content: row.content,
    ogImage: row.og_image,
    favicon: row.favicon,
    domain: row.domain,
    sourceType: row.source_type,
    status: row.status,
    aiStatus: row.ai_status,
    summary: row.summary,
    categoryId: row.category_id,
    category: row.category_name
      ? {
          id: row.category_id!,
          name: row.category_name,
          color: row.category_color!,
          icon: row.category_icon!
        }
      : null,
    tags: tags || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapSearchResultRow(row: Record<string, unknown>, score: number = 0) {
  return {
    id: Number(row.id),
    url: String(row.url),
    title: row.title ? String(row.title) : null,
    description: row.description ? String(row.description) : null,
    ogImage: row.og_image ? String(row.og_image) : null,
    favicon: row.favicon ? String(row.favicon) : null,
    domain: row.domain ? String(row.domain) : null,
    status: String(row.status),
    createdAt: String(row.created_at),
    score
  };
}