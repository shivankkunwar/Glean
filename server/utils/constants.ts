export const MAX_PAGE_LIMIT = 60;
export const DEFAULT_PAGE_LIMIT = 24;
export const MAX_EMBEDDING_RESULTS = 50;
export const MIN_SIMILARITY_SCORE = 0.6;

export const QUEUE_CONCURRENCY = 1;
export const FETCH_TIMEOUT_MS = 25000;
export const AI_TIMEOUT_MS = 45000;

export const RETRY_BACKOFF_MS = [15000, 45000, 120000];

export const PUBLIC_ROUTES = new Set([
  '/api/login',
  '/api/logout',
  '/api/session',
  '/api/share',
  '/api/health',
  '/_nuxt',
  '/manifest.webmanifest'
]);

export const DEFAULT_CATEGORIES: Array<{ name: string; color: string; icon: string }> = [
  { name: 'Uncategorized', color: '#f3f4f6', icon: '📌' },
  { name: 'Inspiration', color: '#fee2e2', icon: '✨' },
  { name: 'Watch Later', color: '#dbeafe', icon: '🎬' },
  { name: 'Read Later', color: '#dcfce7', icon: '📚' },
  { name: 'Tools', color: '#ede9fe', icon: '🧰' }
];