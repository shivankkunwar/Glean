export type CanonicalSourceType = 'youtube' | 'twitter' | 'github' | 'reddit' | 'article' | 'x-article' | 'generic' | 'other';

export type CanonicalDocument = {
  title?: string;
  sourceType: CanonicalSourceType;
  domain?: string;
  authorOrChannel?: string;
  description?: string;
  excerpt?: string;
  url: string;
  canonicalText: string;
  structured?: {
    tweetText?: string;
    author?: string;
    handle?: string;
    links?: string[];
    listedItems?: string[];
    resolvedLinks?: Record<string, string>;
    engagement?: {
      replies?: number;
      retweets?: number;
      likes?: number;
      bookmarks?: number;
    };
    media?: {
      photos?: Array<{ url: string }>;
      videos?: Array<{ url: string; duration?: number; views?: number }>;
    };
    thread?: Array<{
      text?: string;
      author?: { name?: string; screen_name?: string };
    }>;
    quotedTweet?: {
      text?: string;
      author?: { name?: string; screen_name?: string };
    };
    redditPost?: {
      postTitle: string;
      postBody: string | null;
      subreddit: string;
      score: number;
      topComments: Array<{ authorName: string; body: string; score: number }>;
    };
    githubRepo?: {
      repoName: string;
      description: string | null;
      language: string | null;
      stars: number;
      topics: string[];
      readme: string | null;
    };
  };
  tokenEstimate: number;
};

export type AITask = 'classify' | 'summarize' | 'embed';

export type AIResultMeta = {
  provider: string;
  model: string;
  version?: string;
};

export type AIClassifyResult = {
  tags: string[];
  topics?: string[];
  keyEntities?: string[];
  categoryHint?: string;
  confidence: number;
  summary?: string;
} & AIResultMeta & {
  skipped?: boolean;
  reason?: string;
};

export type AISummarizeResult = {
  summary: string;
  confidence: number;
} & AIResultMeta & {
  skipped?: boolean;
  reason?: string;
};

export type AIEmbedResult = {
  vectors: number[][];
} & AIResultMeta & {
  skipped?: boolean;
  reason?: string;
};

export interface AIProvider {
  readonly name: string;
  enabled(): boolean;
  summarize(input: CanonicalDocument): Promise<AISummarizeResult>;
  classify(input: CanonicalDocument): Promise<AIClassifyResult>;
  embed(texts: string[]): Promise<AIEmbedResult>;
}

export type ProviderDecision = {
  provider: string;
  model: string;
  task: AITask;
  reason: string;
};
