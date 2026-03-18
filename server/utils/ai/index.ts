import { createOpenRouterProvider } from './openrouter';
import { createGeminiProvider } from './gemini';
import { noopProvider } from './noop';
import type {
  AITask,
  CanonicalDocument,
  ProviderDecision,
  AIProvider
} from './types';

function getEnvInt(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (!raw) {
    return defaultValue;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function getRoutingWindow(task: AITask): number {
  if (task === 'summarize') {
    return getEnvInt('AI_SUMMARIZE_PAYLOAD_TOKENS', 2500);
  }
  if (task === 'classify') {
    return getEnvInt('AI_CLASSIFY_PAYLOAD_TOKENS', 1000);
  }
  return getEnvInt('AI_EMBED_PAYLOAD_TOKENS', 3000);
}

function providerNameFromEnv(): string {
  const provided = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (!provided) {
    return 'auto';
  }

  return provided;
}

function costMode(): string {
  return process.env.AI_COST_MODE?.trim().toLowerCase() || 'free-only';
}

function embedProviderName(): string {
  return process.env.AI_EMBED_PROVIDER?.trim().toLowerCase() || 'gemini';
}

export function resolveProvider(task: AITask, doc: CanonicalDocument): AIProvider {
  const provider = providerNameFromEnv();
  const mode = costMode();
  const embedProvider = embedProviderName();
  const openRouterProvider = createOpenRouterProvider();
  const geminiProvider = createGeminiProvider();

  if (mode === 'free-only' && provider === 'noop') {
    return noopProvider;
  }

  if (task === 'embed') {
    if (embedProvider === 'gemini' && geminiProvider.enabled()) {
      return geminiProvider;
    }

    if (openRouterProvider.enabled() && process.env.AI_ALLOW_OPENROUTER_EMBED === 'true') {
      return openRouterProvider;
    }

    return noopProvider;
  }

  if (provider === 'openrouter' || provider === 'auto') {
    if (!openRouterProvider.enabled()) {
      return noopProvider;
    }
    return openRouterProvider;
  }

  const tokenWindow = getRoutingWindow(task);
  if (doc.tokenEstimate <= tokenWindow && openRouterProvider.enabled()) {
    return openRouterProvider;
  }

  return noopProvider;
}

export function resolveProviderDecision(task: AITask, doc: CanonicalDocument): ProviderDecision {
  const provider = providerNameFromEnv();
  const mode = costMode();
  const embedProvider = embedProviderName();
  const openRouterEnabled = createOpenRouterProvider().enabled();
  const geminiEnabled = createGeminiProvider().enabled();
  const tokenWindow = getRoutingWindow(task);

  if (mode === 'free-only' && provider === 'noop') {
    return { provider: 'noop', model: 'disabled', task, reason: 'AI provider disabled in free-only mode' };
  }

  if (task === 'embed') {
    if (embedProvider === 'gemini' && geminiEnabled) {
      return { provider: 'gemini', model: 'configured', task, reason: 'embed provider set to gemini' };
    }

    if (openRouterEnabled && process.env.AI_ALLOW_OPENROUTER_EMBED === 'true') {
      return {
        provider: 'openrouter',
        model: 'configured',
        task,
        reason: 'gemini unavailable, openrouter embed explicitly allowed'
      };
    }

    return { provider: 'noop', model: 'disabled', task, reason: 'no free embedding provider configured' };
  }

  if ((provider === 'openrouter' || provider === 'auto') && openRouterEnabled) {
    return { provider: 'openrouter', model: 'config', task, reason: 'env provider override' };
  }

  if (!openRouterEnabled) {
    return { provider: 'noop', model: 'disabled', task, reason: 'no external provider configured' };
  }

  if (doc.tokenEstimate > tokenWindow) {
    return {
      provider: 'noop',
      model: 'disabled',
      task,
      reason: `payload exceeds token window (${doc.tokenEstimate} > ${tokenWindow})`
    };
  }

  return {
    provider: 'openrouter',
    model: 'configured',
    task,
    reason: 'payload within configured window'
  };
}
