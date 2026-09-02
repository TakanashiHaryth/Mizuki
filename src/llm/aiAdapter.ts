/** Selects configured AI providers in priority order and falls back on failure. */

import { LLMAdapter } from '../types';
import { config } from '../config';
import { logger } from '../services/logger';
import { geminiAdapter } from './geminiAdapter';
import { openRouterAdapter } from './openRouterAdapter';

export interface NamedLLMAdapter {
  name: string;
  model: string;
  adapter: LLMAdapter;
}

export function createFallbackAdapter(providers: NamedLLMAdapter[]): LLMAdapter {
  return {
    async chat(params): Promise<string> {
      let lastError: unknown;

      for (const [index, provider] of providers.entries()) {
        try {
          return await provider.adapter.chat(params);
        } catch (err) {
          lastError = err;
          if (index < providers.length - 1) {
            logger.warn({ provider: provider.name }, 'AI provider failed; trying fallback');
          }
        }
      }

      throw lastError || new Error('No AI provider is configured');
    },
  };
}

export const configuredAIProviders: NamedLLMAdapter[] = [
  ...(config.gemini.apiKey
    ? [{ name: 'Gemini', model: config.gemini.model, adapter: geminiAdapter }]
    : []),
  ...(config.openRouter.apiKey
    ? [{ name: 'OpenRouter', model: config.openRouter.model, adapter: openRouterAdapter }]
    : []),
];

export const aiAdapter = createFallbackAdapter(configuredAIProviders);
