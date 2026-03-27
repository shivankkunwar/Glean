import type {
  AIClassifyResult,
  AIEmbedResult,
  AIProvider,
  AISummarizeResult,
  CanonicalDocument
} from './types';

function getEnv(key: string) {
  return process.env[key];
}

const skippedBase = {
  provider: 'gemini',
  model: 'disabled',
  version: 'v1',
  skipped: true as const,
  reason: 'Gemini provider supports embedding in v1 only'
};

const DEFAULT_EMBED_DIMENSIONS = 768; // Use MRL to reduce storage (3072 default -> 768)

export function createGeminiProvider(): AIProvider {
  const apiKey = getEnv('GEMINI_API_KEY') || getEnv('AI_GEMINI_API_KEY');
  const model = getEnv('AI_GEMINI_EMBED_MODEL') || 'gemini-embedding-2-preview'; // Latest multimodal embedding model
  const baseUrl = getEnv('AI_GEMINI_BASE_URL') || 'https://generativelanguage.googleapis.com/v1beta';
  const outputDimensions = Number(getEnv('AI_GEMINI_EMBED_DIMENSIONS')) || DEFAULT_EMBED_DIMENSIONS;

  async function embedOne(text: string): Promise<number[]> {
    const response = await fetch(
      `${baseUrl}/models/${encodeURIComponent(model)}:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: `models/${model}`,
          content: {
            parts: [{ text }]
          },
          outputDimensionality: outputDimensions // Use MRL to get smaller vectors
        })
      }
    );

    if (!response.ok) {
      const textBody = await response.text();
      throw new Error(`Gemini embeddings error (${response.status}): ${textBody || 'request failed'}`);
    }

    const payload = (await response.json()) as {
      embedding?: { values?: number[] };
    };

    return payload.embedding?.values ?? [];
  }

  return {
    name: 'gemini',
    enabled: () => Boolean(apiKey),
    classify: async (_input: CanonicalDocument): Promise<AIClassifyResult> => ({
      tags: [],
      topics: [],
      categoryHint: undefined,
      confidence: 0,
      ...skippedBase
    }),
    summarize: async (_input: CanonicalDocument): Promise<AISummarizeResult> => ({
      summary: '',
      confidence: 0,
      ...skippedBase
    }),
    embed: async (texts: string[]): Promise<AIEmbedResult> => {
      if (!apiKey) {
        return {
          vectors: [],
          provider: 'gemini',
          model,
          version: 'v1',
          skipped: true,
          reason: 'GEMINI_API_KEY is not set'
        };
      }

      const vectors: number[][] = [];

      try {
        for (const rawText of texts) {
          const text = rawText.trim();
          if (!text) {
            vectors.push([]);
            continue;
          }
          vectors.push(await embedOne(text));
        }
      } catch (err: any) {
        if (err.message?.includes('User location is not supported') || err.message?.includes('400')) {
          return {
            vectors: [],
            provider: 'gemini',
            model,
            version: 'v1',
            skipped: true,
            reason: 'Gemini API not available in this region or rejected request'
          };
        }
        throw err;
      }

      return {
        vectors,
        provider: 'gemini',
        model,
        version: 'v1'
      };
    }
  };
}
