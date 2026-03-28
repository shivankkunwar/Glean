import {
  type AIClassifyResult,
  type AIEmbedResult,
  type AISummarizeResult,
  type AIProvider,
  type CanonicalDocument,
  type CanonicalSourceType
} from './types';

function parseProviderJson(content: string, fallback: Record<string, unknown> = {}): Record<string, unknown> {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      return fallback;
    }

    try {
      return JSON.parse(match[0]);
    } catch {
      return fallback;
    }
  }
}

function getEnv(key: string) {
  return process.env[key];
}

function getOpenRouterModels() {
  const defaultChain = [
    'nvidia/nemotron-3-super-120b-a12b:free',
    'openrouter/hunter-alpha',
    'stepfun/step-3.5-flash:free',
    'openrouter/free'
  ];

  const parseChain = (key: string): string[] => {
    const raw = getEnv(key);
    if (!raw) {
      return defaultChain;
    }
    const parsed = raw
      .split(',')
      .map((item: string) => item.trim())
      .filter(Boolean);
    return parsed.length ? parsed : defaultChain;
  };

  return {
    classify: getEnv('AI_OPENROUTER_CLASSIFY_MODEL') || defaultChain[0],
    summarize: getEnv('AI_OPENROUTER_SUMMARY_MODEL') || defaultChain[0],
    classifyChain: parseChain('AI_OPENROUTER_CLASSIFY_FALLBACKS'),
    summarizeChain: parseChain('AI_OPENROUTER_SUMMARY_FALLBACKS'),
    embed: getEnv('AI_OPENROUTER_EMBED_MODEL') || 'text-embedding-3-small'
  };
}

function toApiError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }

  return 'Unknown error while calling OpenRouter';
}

function buildSourceSuffix(sourceType: CanonicalSourceType): string {
  if (sourceType === 'twitter') {
    return `

This source is a short social post. Ignore embed HTML, author footer, and platform boilerplate. Focus on the post's main claim, recommendations, referenced concepts, and named entities. If the post contains a numbered list, preserve the list theme and extract the listed concepts as specific entities.`;
  }
  
  if (sourceType === 'youtube') {
    return `

This source is a video. Focus on the title and any available description to understand the topic and content.`;
  }
  
  if (sourceType === 'github') {
    return `

This source is a GitHub repository or code-related page. Focus on the project purpose, technologies used, key concepts, and notable features or achievements.`;
  }

  if (sourceType === 'reddit') {
    return `

This source is a Reddit post with comments. Focus on the post title, post body, and top comment themes. Extract key discussions, opinions, and any linked resources mentioned.`;
  }

  if (sourceType === 'article') {
    return `

This source is a web article or blog post. Focus on the main topic, key arguments, and notable insights or facts.`;
  }

  if (sourceType === 'x-article') {
    return `

This is a long-form article published natively on X (formerly Twitter). Extract the main thesis, key arguments, section topics, and named concepts. Treat it like a blog post, not a social post.`;
  }
  
  return '';
}

function buildClassifySystemPrompt(): string {
  return `You classify saved web content for later retrieval.

Your job is to extract search-friendly metadata from the source text. Prefer precise, concrete terms that a user would realistically search for later.

Priorities:
1. Prefer explicit entities mentioned in the text: technologies, products, protocols, APIs, papers, standards, design patterns, companies, libraries, named concepts.
2. Prefer specific technical concepts over broad labels.
3. Preserve important multi-word terms exactly when possible.
4. Use only information supported by the provided text.
5. For social posts, focus on the actual content of the post, not embed markup, platform chrome, or engagement context.

Tag rules:
- Output 4 to 8 tags when enough evidence exists.
- Tags must be lowercase.
- Tags must be concise noun phrases.
- Avoid duplicates and near-duplicates.
- Avoid generic tags unless they are clearly central and there are no better specifics.
- Avoid filler tags like: interesting, article, post, thread, reading list, resource, notes, thoughts.
- Do not include source/platform tags like twitter, youtube, github; the system adds those separately.
- Prefer terms like "cap theorem" over broad terms like "distributed systems" when both are available.

Topics rules:
- Topics are broader buckets than tags.
- Output 1 to 4 topics.
- Topics should still be specific enough to be useful for retrieval.

Key Entities rules:
- Extract specific named things: libraries, frameworks, tools, APIs, papers, companies, protocols, products.
- Extract version numbers if mentioned (e.g., "Node.js 20", "React 18").
- Extract proper nouns and technical terms.
- Output 3 to 10 entities when the text contains enough specificity.
- Entities should be searchable exact matches: "LangChain", "pgvector", "GPT-4", "Docker".

Category rules:
- Set categoryHint only when the category is obvious from the text.
- Otherwise return null.

Confidence scoring:
- 0.9 to 1.0 = highly explicit, concrete evidence (specific technologies named)
- 0.6 to 0.89 = mostly clear with mild ambiguity
- 0.3 to 0.59 = partial evidence
- below 0.3 = weak evidence

Return valid JSON only with exactly this structure:
{"tags": string[], "topics": string[], "keyEntities": string[], "categoryHint": string|null, "confidence": number}`;
}

function buildSummarizeSystemPrompt(): string {
  return `You summarize saved web content for fast recognition and later retrieval.

Your summary should help a user quickly understand why this bookmark matters.

Rules:
- Be factual, compact, and specific.
- Preserve important named entities, technologies, papers, products, and concepts.
- Prefer what the source actually says over generic framing.
- Do not invent details, context, or conclusions not present in the text.
- For social posts, summarize the actual post content, not the embed wrapper or author footer.
- If the content is a list, thread, or collection of references, say that clearly and mention the most important items or themes.
- For technical lists, mention the specific technologies or concepts listed.
- Avoid hype, marketing language, and generic phrases like "this discusses" or "this is about" when a more direct summary is possible.
- Keep the summary readable in a bookmark detail view.
- Target 1 to 3 sentences, usually under 320 characters.

Confidence scoring:
- 0.9 to 1.0 = summary is strongly grounded in explicit source text
- 0.6 to 0.89 = mostly grounded, minor ambiguity
- 0.3 to 0.59 = weak or incomplete source text
- below 0.3 = insufficient source text

Return valid JSON only with exactly this structure:
{"summary": string, "confidence": number}`;
}

function buildUserPrompt(input: CanonicalDocument): string {
  const parts: string[] = [
    `SOURCE TYPE: ${input.sourceType}`,
    `DOMAIN: ${input.domain || 'unknown'}`,
    `URL: ${input.url}`
  ];
  
  if (input.title) {
    parts.push(`TITLE: ${input.title}`);
  }
  
  if (input.authorOrChannel) {
    parts.push(`AUTHOR: ${input.authorOrChannel}`);
  }
  
  // Add structured metadata if available
  if (input.structured) {
    if (input.structured.author && input.structured.handle) {
      parts.push(`AUTHOR: ${input.structured.author} (@${input.structured.handle})`);
    }
    
    if (input.structured.tweetText) {
      parts.push(`TWEET TEXT:\n${input.structured.tweetText}`);
    }
    
    if (input.structured.listedItems && input.structured.listedItems.length > 0) {
      parts.push(`REFERENCED ITEMS:\n${input.structured.listedItems.map((item, i) => `${i + 1}. ${item}`).join('\n')}`);
    }
    
    if (input.structured.links && input.structured.links.length > 0) {
      parts.push(`LINKS: ${input.structured.links.slice(0, 5).join(', ')}`);
    }
  }
  
  // Add description and excerpt if not already covered by structured data
  if (input.description && !input.structured?.tweetText) {
    parts.push(`DESCRIPTION: ${input.description}`);
  }
  
  if (input.excerpt && !input.structured?.tweetText) {
    parts.push(`CONTENT:\n${input.excerpt}`);
  }
  
  // Add source-specific suffix
  parts.push(buildSourceSuffix(input.sourceType));
  
  return parts.filter(Boolean).join('\n\n');
}

export function createOpenRouterProvider(): AIProvider {
  const apiKey = getEnv('AI_OPENROUTER_API_KEY') || getEnv('OPENROUTER_API_KEY');
  const baseUrl = getEnv('AI_OPENROUTER_BASE_URL') || 'https://openrouter.ai/api/v1';
  const models = getOpenRouterModels();

  async function callChatCompletion(task: 'classify' | 'summarize', input: CanonicalDocument, modelOverride?: string) {
    const systemPrompt = task === 'classify' 
      ? buildClassifySystemPrompt() 
      : buildSummarizeSystemPrompt();
    
    const userPrompt = buildUserPrompt(input);

    const candidates = modelOverride
      ? [modelOverride]
      : task === 'classify'
        ? [models.classify, ...models.classifyChain.filter((item) => item !== models.classify)]
        : [models.summarize, ...models.summarizeChain.filter((item) => item !== models.summarize)];

    const errors: string[] = [];

    for (const model of candidates) {
      const body = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 500
      };

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const text = await response.text();
        errors.push(`${model}: ${response.status}`);

        if (response.status === 429 || response.status >= 500 || response.status === 404) {
          continue;
        }

        throw new Error(`OpenRouter error (${response.status}) using ${model}: ${text || 'request failed'}`);
      }

      const payload = (await response.json()) as {
        model?: string;
        choices?: Array<{ message?: { content?: string } }>;
      };

      const message = payload.choices?.[0]?.message?.content || '{}';
      return { message: parseProviderJson(String(message)), model: payload.model || model };
    }

    throw new Error(`OpenRouter all fallbacks failed for ${task}. Attempts: ${errors.join(', ')}`);
  }

  async function callEmbeddings(texts: string[]): Promise<number[][]> {
    const payload = {
      model: models.embed,
      input: texts
    };

    const response = await fetch(`${baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenRouter embeddings error (${response.status}): ${text || 'request failed'}`);
    }

    const body = (await response.json()) as {
      data?: Array<{ embedding?: number[] }>;
    };

    return (body.data || []).map((row) => row.embedding || []);
  }

  return {
    name: 'openrouter',
    enabled: () => Boolean(apiKey),
    summarize: async (input: CanonicalDocument): Promise<AISummarizeResult> => {
      if (!apiKey) {
        throw new Error('AI_OPENROUTER_API_KEY not set');
      }

      try {
        const result = await callChatCompletion('summarize', input);
        const summary = String(((result.message as any).summary ?? '').slice(0, 2000) || '');
        const confidence = Number(result.message.confidence ?? 0);
        return {
          summary,
          confidence: Number.isFinite(confidence) ? confidence : 0,
          provider: 'openrouter',
          model: result.model,
          version: 'v1'
        };
      } catch (error) {
        throw new Error(`Summarization failed: ${toApiError(error)}`);
      }
    },
    classify: async (input: CanonicalDocument): Promise<AIClassifyResult> => {
      if (!apiKey) {
        throw new Error('AI_OPENROUTER_API_KEY not set');
      }

      try {
        const result = await callChatCompletion('classify', input);
        const tags = Array.isArray(result.message.tags)
          ? result.message.tags.map((tag) => String(tag).toLowerCase().trim()).filter(Boolean)
          : [];
        const topics = Array.isArray(result.message.topics)
          ? result.message.topics.map((topic) => String(topic).toLowerCase().trim()).filter(Boolean)
          : [];
        const keyEntities = Array.isArray(result.message.keyEntities)
          ? result.message.keyEntities.map((e: unknown) => String(e).trim()).filter(Boolean)
          : [];
        const categoryHint = result.message.categoryHint
          ? String(result.message.categoryHint)
          : undefined;
        const confidence = Number(result.message.confidence ?? 0);

        return {
          tags,
          topics,
          keyEntities,
          categoryHint,
          confidence: Number.isFinite(confidence) ? confidence : 0,
          provider: 'openrouter',
          model: result.model,
          version: 'v1'
        };
      } catch (error) {
        throw new Error(`Classification failed: ${toApiError(error)}`);
      }
    },
    embed: async (texts: string[]): Promise<AIEmbedResult> => {
      if (!apiKey) {
        throw new Error('AI_OPENROUTER_API_KEY not set');
      }

      if (!texts.length) {
        return {
          vectors: [],
          provider: 'openrouter',
          model: models.embed,
          version: 'v1'
        };
      }

      try {
        const vectors = await callEmbeddings(texts);
        return {
          vectors,
          provider: 'openrouter',
          model: models.embed,
          version: 'v1'
        };
      } catch (error) {
        throw new Error(`Embedding failed: ${toApiError(error)}`);
      }
    }
  };
}

/**
 * Compress a raw YouTube transcript into a dense semantic digest for AI indexing.
 * - Chunks the transcript if it exceeds the model token window
 * - Summarizes each chunk with a focused extraction prompt
 * - Returns a 1,200-char max combined digest
 * - Falls back to truncation on any failure
 */
export async function compressTranscriptForIndexing(
  transcript: string,
  title: string
): Promise<string> {
  const apiKey = process.env.AI_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!apiKey || !transcript) {
    // No key configured — return truncated version (better than nothing)
    return transcript.slice(0, 4000);
  }

  const CHUNK_SIZE = 4000;       // ~1,000 tokens per chunk (safe for free models)
  const MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';
  const BASE_URL = process.env.AI_OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
  const TIMEOUT_MS = 30000;

  // Build chunks
  const chunks: string[] = [];
  for (let i = 0; i < transcript.length; i += CHUNK_SIZE) {
    chunks.push(transcript.slice(i, i + CHUNK_SIZE));
  }

  async function callModel(prompt: string): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 400
        }),
        signal: controller.signal
      });
      if (!response.ok) return null;
      const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      return data.choices?.[0]?.message?.content?.trim() || null;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  // Summarize each chunk
  const chunkSummaries: string[] = [];
  for (const chunk of chunks.slice(0, 5)) { // Process at most 5 chunks (~20k chars)
    const result = await callModel(
      `You extract key information from a section of a YouTube video transcript.\n` +
      `Video title: "${title.slice(0, 100)}"\n\n` +
      `TRANSCRIPT SECTION:\n${chunk}\n\n` +
      `List the main topics, key concepts, facts, and notable insights covered in this section. ` +
      `Be specific and concrete. Use 3-6 short bullet points. No intro sentence.`
    );
    if (result) chunkSummaries.push(result);
  }

  if (chunkSummaries.length === 0) {
    // All chunk calls failed — fallback to raw truncation
    return transcript.slice(0, 4000);
  }

  // If only one chunk or few summaries, return them directly
  const combined = chunkSummaries.join('\n\n');
  if (combined.length <= 1500) return combined;

  // Final synthesis pass when we have multiple chunk summaries
  const merged = await callModel(
    `You are summarizing a full YouTube video based on section-by-section notes.\n` +
    `Video title: "${title.slice(0, 100)}"\n\n` +
    `SECTION NOTES:\n${combined.slice(0, 8000)}\n\n` +
    `Write a final semantic digest of this video in 150-200 words. ` +
    `Focus on: main topic, key concepts/technologies mentioned, insights, and what a viewer would learn. ` +
    `Be specific and searchable. No bullet points.`
  );

  return merged || combined.slice(0, 1500);
}
