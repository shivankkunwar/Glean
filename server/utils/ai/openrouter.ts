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
  // PRIMARY: Groq - fast, reliable JSON mode, 14,400 RPD free
  // SECONDARY: OpenRouter free models
  const classifyModels = [
    'groq:llama-3.3-70b-versatile',           // Primary - fastest, native JSON mode
    'openrouter:meta-llama/llama-3.1-8b-instruct:free', // Secondary
    'openrouter:stepfun/step-3.5-flash:free', // Tertiary - use minimal prompt
    'openrouter:openrouter/free',             // Last resort
  ];

  const summarizeModels = [
    'groq:llama-3.3-70b-versatile',
    'openrouter:meta-llama/llama-3.1-8b-instruct:free',
    'openrouter:stepfun/step-3.5-flash:free',
    'openrouter:openrouter/free',
  ];

  return {
    classify: getEnv('AI_CLASSIFY_MODEL') || classifyModels[0],
    summarize: getEnv('AI_SUMMARIZE_MODEL') || summarizeModels[0],
    classifyChain: classifyModels,
    summarizeChain: summarizeModels,
    embed: getEnv('AI_OPENROUTER_EMBED_MODEL') || getEnv('AI_EMBED_MODEL') || 'text-embedding-3-small'
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

const TECH_TERMS = [
  "react", "vue", "angular", "svelte", "next.js", "typescript", "javascript", "node.js",
  "python", "rust", "golang", "java", "kotlin", "swift", "rust", "c++", "c#",
  "kubernetes", "docker", "k8s", "terraform", "ansible", "aws", "gcp", "azure",
  "postgres", "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "sqlite",
  "graphql", "rest", "api", "grpc", "websocket", "oauth", "jwt", "authentication",
  "llm", "gpt", "claude", "openai", "anthropic", "rag", "vector database", "embeddings",
  "machine learning", "deep learning", "neural network", "transformer", "attention",
  "cap theorem", "microservices", "monolith", "event sourcing", "cqrs", "saga",
  "domain driven design", "ddd", "hexagonal architecture", "clean architecture",
  "ci/cd", "github actions", "gitlab ci", "jenkins", "testing", "tdd",
  "tailwind", "css", "html", "sass", "styled components",
  "prisma", "drizzle", "typeorm", "prisma", "supabase", "planetscale",
  "vercel", "netlify", "cloudflare", "edge computing", "serverless",
  "blockchain", "web3", "solidity", "ethereum", "bitcoin", "crypto",
  "security", "encryption", "ssl", "https", "cors", "xss", "csrf"
];

function buildMinimalPrompt(): string {
  return `List 5 specific technical tags for this content.
Output only: {"tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]}
Be specific: prefer "react hooks" over "javascript", "rag pipeline" over "ai".
No explanation. Only JSON.`;
}

function buildStandardPrompt(): string {
  return `Extract 4-8 specific technical tags from the content below.

Output ONLY this JSON, nothing else:
{"tags": ["tag1", "tag2"]}

Rules:
- Specific terms only: "cap theorem" not "distributed systems"
- Include: technologies, frameworks, protocols, named patterns
- Exclude: generic words, platform names (github, twitter)

Examples:
"Building RAG with LangChain" → {"tags": ["rag", "langchain", "vector embeddings", "retrieval augmented generation"]}
"React 18 concurrent features" → {"tags": ["react 18", "concurrent rendering", "suspense", "server components"]}`;
}

function buildClassifySystemPrompt(): string {
  return buildStandardPrompt();
}

function buildClassifyUserPrompt(content: string): string {
  const truncated = content.slice(0, 800);
  return `<content>
${truncated}
</content>

JSON tags:`;
}

function parseTagResponse(raw: string): string[] {
  // Attempt 1: clean JSON parse
  try {
    const parsed = JSON.parse(raw.trim());
    if (Array.isArray(parsed?.tags) && parsed.tags.length >= 2) {
      return parsed.tags.filter(Boolean).map((t: string) => t.toLowerCase().trim());
    }
  } catch {}

  // Attempt 2: extract JSON object anywhere in response
  const jsonMatch = raw.match(/\{[\s\S]*?"tags"[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed?.tags) && parsed.tags.length >= 2) {
        return parsed.tags.filter(Boolean).map((t: string) => t.toLowerCase().trim());
      }
    } catch {}
  }

  // Attempt 3: extract array directly
  const arrayMatch = raw.match(/\[([^\]]+)\]/);
  if (arrayMatch) {
    const tags = arrayMatch[1]
      .split(",")
      .map(s => s.replace(/['"]/g, "").trim().toLowerCase())
      .filter(s => s.length > 1 && s.length < 50);
    if (tags.length >= 2) return tags;
  }

  // Attempt 4: line-by-line extraction (some models output bullet points)
  const lines = raw.split("\n")
    .map(l => l.replace(/^[-*•]\s*/, "").replace(/['"]/g, "").trim().toLowerCase())
    .filter(l => l.length > 2 && l.length < 60 && !l.includes("{") && !l.includes(":"));
  
  if (lines.length >= 2) return lines.slice(0, 8);

  return [];
}

function deriveTagsFromContent(content: string): string[] {
  const lower = content.toLowerCase();
  return TECH_TERMS
    .filter(term => lower.includes(term.toLowerCase()))
    .slice(0, 6);
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
    const candidates = modelOverride
      ? [modelOverride]
      : task === 'classify'
        ? models.classifyChain
        : models.summarizeChain;

    const errors: string[] = [];
    const groqApiKey = getEnv('GROQ_API_KEY');
    const openrouterApiKey = getEnv('AI_OPENROUTER_API_KEY') || getEnv('OPENROUTER_API_KEY');

    for (const modelSpec of candidates) {
      // Parse model specification: "groq:model-name" or "openrouter:model-name"
      const [provider, modelName] = modelSpec.includes(':') 
        ? modelSpec.split(':') 
        : ['openrouter', modelSpec];
      
      const isGroq = provider === 'groq';
      const isWeakModel = modelName.includes('step') || modelName.includes('flash') || modelName.includes('instant') || modelSpec.includes('openrouter/free');
      
      const actualPrompt = task === 'classify' && isWeakModel 
        ? buildMinimalPrompt() 
        : (task === 'classify' ? buildClassifySystemPrompt() : buildSummarizeSystemPrompt());
      
      const userPrompt = task === 'classify'
        ? buildClassifyUserPrompt(input.canonicalText)
        : buildUserPrompt(input);

      const baseUrl = isGroq 
        ? 'https://api.groq.com/openai/v1' 
        : 'https://openrouter.ai/api/v1';
      
      const apiKey = isGroq ? groqApiKey : openrouterApiKey;
      
      if (!apiKey) {
        errors.push(`${modelSpec}: missing API key`);
        continue;
      }

      const body: Record<string, unknown> = {
        model: modelName,
        messages: [
          { role: 'system', content: actualPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: task === 'classify' ? 150 : 500
      };

      // Use native JSON mode for Groq (enforces valid JSON output)
      if (isGroq && task === 'classify') {
        body.response_format = { type: 'json_object' };
      }

      try {
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
          errors.push(`${modelSpec}: ${response.status}`);
          
          // 429 = rate limited, try next provider
          if (response.status === 429) continue;
          // 5xx = server error, try next
          if (response.status >= 500) continue;
          // 404 = model not found, try next
          if (response.status === 404) continue;
          
          throw new Error(`API error (${response.status}) using ${modelSpec}: ${text || 'request failed'}`);
        }

        const payload = (await response.json()) as {
          model?: string;
          choices?: Array<{ message?: { content?: string } }>;
        };

        const message = payload.choices?.[0]?.message?.content || '{}';
        return { message: parseProviderJson(String(message)), model: payload.model || modelName };
      } catch (err) {
        errors.push(`${modelSpec}: ${err instanceof Error ? err.message : 'unknown error'}`);
        continue;
      }
    }

    throw new Error(`All providers failed for ${task}. Attempts: ${errors.join(', ')}`);
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
        const rawContent = String(result.message?.tags ? JSON.stringify(result.message) : result.message?.content || '{}');
        
        // Try multiple parsing strategies
        let tags = parseTagResponse(rawContent);
        
        // If parsing failed, try the tags field directly
        if (tags.length < 2 && Array.isArray(result.message.tags)) {
          tags = result.message.tags.map((tag: string) => String(tag).toLowerCase().trim()).filter(Boolean);
        }
        
        // Last resort: derive from content using known tech terms
        if (tags.length < 2) {
          tags = deriveTagsFromContent(input.canonicalText);
        }
        
        // Extract entities from tags
        const keyEntities = tags
          .filter(tag => {
            const words = tag.split(' ');
            return words.some(w => w.length > 2 && !['the', 'and', 'for', 'with', 'from'].includes(w));
          })
          .slice(0, 8);
        
        // Infer topics from tags
        const topics = tags
          .filter(tag => tag.includes(' ') && tag.length > 5)
          .slice(0, 4);

        return {
          tags,
          topics,
          keyEntities,
          categoryHint: undefined,
          confidence: tags.length > 0 ? 0.8 : 0,
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
