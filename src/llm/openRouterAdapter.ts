/** OpenRouter chat adapter used as the free fallback when Gemini fails. */

import { LLMAdapter } from '../types';
import { config } from '../config';
import { logger } from '../services/logger';
import { classifyProviderError, LLMRateLimitError, LLMTimeoutError } from './providerErrors';

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
}

export function classifyOpenRouterError(err: any): Error {
  return classifyProviderError(err);
}

export const openRouterAdapter: LLMAdapter = {
  async chat(params): Promise<string> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.openRouter.apiKey}`,
          'Content-Type': 'application/json',
          'X-OpenRouter-Title': 'Mizuki',
        },
        body: JSON.stringify({
          model: config.openRouter.model,
          messages: [
            { role: 'system', content: params.systemPrompt },
            ...params.history,
            { role: 'user', content: params.userMessage },
          ],
        }),
        signal: AbortSignal.timeout(config.ai.timeoutMs),
      });
      const responseText = await response.text();
      let payload: OpenRouterResponse = {};
      try {
        payload = JSON.parse(responseText) as OpenRouterResponse;
      } catch {
        if (response.ok) throw new Error('OpenRouter returned an invalid response');
      }

      if (!response.ok) {
        throw Object.assign(
          new Error(payload.error?.message || `OpenRouter request failed (${response.status})`),
          { status: response.status }
        );
      }

      const answer = payload.choices?.[0]?.message?.content?.trim();
      if (!answer) throw new Error('OpenRouter returned an empty response');
      return answer;
    } catch (err: any) {
      const classifiedError = classifyOpenRouterError(err);
      if (classifiedError instanceof LLMRateLimitError) {
        logger.warn('OpenRouter rate limit hit (429)');
      } else if (classifiedError instanceof LLMTimeoutError) {
        logger.warn({ timeoutMs: config.ai.timeoutMs }, 'OpenRouter request timed out');
      } else {
        logger.error({ err }, 'OpenRouter API call failed');
      }
      throw classifiedError;
    }
  },
};
