export type CuratedBookmark = {
  id: number;
  url: string;
  title: string | null;
  description: string | null;
  summary?: string | null;
  ogImage: string | null;
  favicon?: string | null;
  domain: string | null;
  sourceType: string | null;
  createdAt: string;
  isPinned?: boolean;
  tags?: Array<{ id: number; name: string }>;
};

export type CuratedTheme = {
  id: string;
  title: string;
  subtitle: string;
  itemCount: number;
  items: CuratedBookmark[];
};

export type CuratedThread = {
  id: string;
  title: string;
  description: string;
  kind: 'reading' | 'research' | 'visual' | 'products' | 'notes' | 'mixed';
  itemCount: number;
  items: CuratedBookmark[];
};

export type WeeklyBrief = {
  title: string;
  dek: string;
  summary: string;
  bullets: string[];
  question: string;
  items: CuratedBookmark[];
};

export type CuratedOverviewResponse = {
  topOfMind: CuratedBookmark[];
  radar: CuratedTheme[];
  threads: CuratedThread[];
  weeklyBrief: WeeklyBrief | null;
  rediscover: CuratedBookmark[];
};
