/**
 * LLM Adapter: Google Gemini.
 * Wraps the current Google Gen AI SDK behind a provider-agnostic interface.
 */

import { Content, GenerateContentConfig, GoogleGenAI, ThinkingLevel } from '@google/genai';
import { LLMAdapter } from '../types';
import { config } from '../config';
import { logger } from '../services/logger';
import { classifyProviderError, LLMRateLimitError, LLMTimeoutError } from './providerErrors';

const genAI = new GoogleGenAI({ apiKey: config.gemini.apiKey });

export { LLMRateLimitError, LLMTimeoutError } from './providerErrors';

/** Converts provider-specific transient statuses into stable application errors. */
export function classifyGeminiError(err: any): Error {
  return classifyProviderError(err);
}

export const geminiAdapter: LLMAdapter = {
  async chat(params): Promise<string> {
    try {
      const history: Content[] = params.history.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));

      const generationConfig: GenerateContentConfig = {
        systemInstruction: params.systemPrompt,
        httpOptions: { timeout: config.ai.timeoutMs },
      };

      // Newer Gemini models think before answering by default. Mizuki handles
      // short group-chat questions, so the lightest supported mode is faster.
      const modelName = config.gemini.model.toLowerCase();
      if (modelName.includes('gemini-3.5')) {
        generationConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.MINIMAL };
      } else if (modelName.includes('gemini-2.5')) {
        generationConfig.thinkingConfig = { thinkingBudget: 0 };
      }

      const chat = genAI.chats.create({
        model: config.gemini.model,
        history,
        config: generationConfig,
      });

      const result = await chat.sendMessage({ message: params.userMessage });
      const response = result.text;

      if (!response) {
        throw new Error('Gemini returned an empty response');
      }

      return response;
    } catch (err: any) {
      const classifiedError = classifyGeminiError(err);
      if (classifiedError instanceof LLMRateLimitError) {
        logger.warn('Gemini rate limit hit (429)');
        throw classifiedError;
      }

      if (classifiedError instanceof LLMTimeoutError) {
        logger.warn({ timeoutMs: config.ai.timeoutMs }, 'Gemini request timed out or was cancelled');
        throw classifiedError;
      }

      logger.error({ err }, 'Gemini API call failed');
      throw classifiedError;
    }
  },
};
