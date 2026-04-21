export type Tag = {
  id: number;
  name: string;
  source: string;
  confidence: number;
};

export type BookmarkCard = {
  id: number;
  url: string | null;
  title: string | null;
  description: string | null;
  content?: string | null;
  ogImage: string | null;
  favicon?: string | null;
  domain: string | null;
  status: string;
  aiStatus?: string | null;
  sourceType?: string | null;
  isPinned?: boolean;
  summary?: string | null;
  sourceMetadata?: string | null;
  tags: Tag[];
  savedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  duration?: string | null;
  price?: string | null;
  categoryId?: number | null;
};

export type VaultSourceType = 'article' | 'note' | 'video' | 'tweet' | 'github' | 'book' | 'product';
export type VaultViewMode = 'all' | 'categories';
export type VaultSourceFilter = {
  label: string;
  value: VaultSourceType;
  icon: string;
  shortLabel: string;
  description: string;
};
export type VaultCategoryPack = {
  type: VaultSourceType;
  label: string;
  icon: string;
  description: string;
  count: number;
  previewCards: BookmarkCard[];
  domains: string[];
  latestSavedAt?: string;
};

export const vaultSourceFilters: VaultSourceFilter[] = [
  { label: 'Articles', value: 'article', icon: 'ph-article', shortLabel: 'Articles', description: 'Long-form reads, essays, and reference material worth coming back to.' },
  { label: 'Notes', value: 'note', icon: 'ph-note-pencil', shortLabel: 'Notes', description: 'Quick thoughts, scratchpad captures, and short personal fragments.' },
  { label: 'Videos', value: 'video', icon: 'ph-youtube-logo', shortLabel: 'Videos', description: 'Talks, demos, and clips you saved for later watching.' },
  { label: 'Tweets', value: 'tweet', icon: 'ph-x-logo', shortLabel: 'Tweets', description: 'Posts, threads, and small internet artifacts with context.' },
  { label: 'GitHub', value: 'github', icon: 'ph-github-logo', shortLabel: 'GitHub', description: 'Repositories, code references, and implementation details.' },
  { label: 'Books', value: 'book', icon: 'ph-book-open', shortLabel: 'Books', description: 'Book captures and covers gathered into a slower reading lane.' },
  { label: 'Products', value: 'product', icon: 'ph-shopping-bag', shortLabel: 'Products', description: 'Tools, gear, and product references collected for later.' }
];

export function isVaultSourceType(value: string): value is VaultSourceType {
  return vaultSourceFilters.some((filter) => filter.value === value);
}

const gradients = [
  'var(--gradient-amber)',
  'var(--gradient-sage)',
  'var(--gradient-terracotta)',
  'var(--gradient-slate)',
  'var(--gradient-pine)',
  'var(--gradient-sand)'
];

export function normalizeBookmarkCards(items: BookmarkCard[]): BookmarkCard[] {
  return (items || []).map((item) => ({
    ...item,
    url: item.url ?? null,
    tags: item.tags || [],
    savedAt: item.savedAt || item.createdAt
  }));
}

export function cardType(card: BookmarkCard): VaultSourceType {
  const sourceType = card.sourceType?.toLowerCase() || '';
  const url = card.url || '';

  if (sourceType === 'note' || sourceType === 'text' || !url || url.startsWith('https://note.local/')) return 'note';
  if (sourceType === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com')) return 'video';
  if (sourceType === 'twitter' || sourceType === 'x' || url.includes('twitter.com') || url.includes('x.com')) return 'tweet';
  if (sourceType === 'github' || url.includes('github.com')) return 'github';
  if (sourceType === 'book') return 'book';
  if (sourceType === 'product') return 'product';
  return 'article';
}

export function labelForSourceType(type: VaultSourceType): string {
  return vaultSourceFilters.find((filter) => filter.value === type)?.label || 'Articles';
}

export function iconForSourceType(type: VaultSourceType): string {
  return vaultSourceFilters.find((filter) => filter.value === type)?.icon || 'ph-article';
}

export function descriptionForSourceType(type: VaultSourceType): string {
  return vaultSourceFilters.find((filter) => filter.value === type)?.description || 'Grouped items from the same lane.';
}

export function cardGradient(card: BookmarkCard): string {
  return gradients[card.id % gradients.length] ?? gradients[0]!;
}

export function isProcessing(card: BookmarkCard): boolean {
  if (card.status === 'failed' || card.aiStatus === 'failed') return false;

  return card.status === 'pending' ||
    card.status === 'processing' ||
    (Boolean(card.aiStatus) && (card.aiStatus === 'pending' || card.aiStatus === 'in_progress'));
}

export function cardClasses(card: BookmarkCard): string[] {
  const type = cardType(card);
  const classes = ['card'];

  if (type === 'note') classes.push('card--note');
  if (type === 'video') classes.push('card--video');
  if (type === 'book') classes.push('card--book');
  if (type === 'product') classes.push('card--product');
  if (type === 'tweet') classes.push('card--tweet');
  if (type === 'github') classes.push('card--github');
  if (isProcessing(card)) classes.push('card--processing');

  return classes;
}

export function cardTitle(card: BookmarkCard): string {
  if (card.title) return card.title;
  if (isProcessing(card)) return card.domain || card.url || 'Untitled';
  return 'Untitled';
}

export function cardDescription(card: BookmarkCard): string {
  return card.summary || card.description || '';
}

export function cardDomain(card: BookmarkCard): string {
  if (card.domain) return card.domain;
  if (!card.url) return 'note';

  try {
    return new URL(card.url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

export function productCategory(card: BookmarkCard): string {
  return card.tags?.[0]?.name || 'Product';
}

export function processingStatusText(card: BookmarkCard): string {
  if (card.sourceType === 'youtube') return 'Pulling video title and transcript…';
  if (card.sourceType === 'twitter') return 'Extracting post content…';
  if (card.sourceType === 'github') return 'Indexing repository details…';
  return 'Fetching page content and generating tags…';
}

export function getTweetMediaImage(card: BookmarkCard): string | null {
  if (cardType(card) !== 'tweet' || !card.sourceMetadata) return null;

  try {
    const metadata = JSON.parse(card.sourceMetadata) as {
      media?: {
        photos?: Array<{ url: string }>;
        videos?: Array<{ thumbnail_url?: string; thumbnail?: string }>;
      };
    };

    if (metadata.media?.photos?.length) return metadata.media.photos[0]?.url || null;
    if (metadata.media?.videos?.length) {
      return metadata.media.videos[0]?.thumbnail_url || metadata.media.videos[0]?.thumbnail || null;
    }

    return null;
  } catch {
    return null;
  }
}

export function relativeTime(iso?: string): string {
  if (!iso) return '';

  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
