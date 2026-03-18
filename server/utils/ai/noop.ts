import { AIProvider, type AIClassifyResult, type AISummarizeResult, type AIEmbedResult, type CanonicalDocument } from './types';

const skippedResponse = {
  provider: 'noop',
  model: 'disabled',
  version: 'v1'
};

export const noopProvider: AIProvider = {
  name: 'noop',
  enabled: () => true,
  summarize: async (input: CanonicalDocument): Promise<AISummarizeResult> => ({
    summary: '',
    confidence: 0,
    skipped: true,
    reason: 'AI disabled or no valid provider configured',
    ...skippedResponse
  }),
  classify: async (input: CanonicalDocument): Promise<AIClassifyResult> => ({
    tags: [],
    topics: [],
    categoryHint: undefined,
    confidence: 0,
    skipped: true,
    reason: 'AI disabled or no valid provider configured',
    ...skippedResponse
  }),
  embed: async (_texts: string[]): Promise<AIEmbedResult> => ({
    vectors: [],
    skipped: true,
    reason: 'AI disabled or no valid provider configured',
    ...skippedResponse
  })
};
