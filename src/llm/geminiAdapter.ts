/**
 * LLM Adapter: Google Gemini.
 * Wraps the current Google Gen AI SDK behind a provider-agnostic interface.
 */

import { GoogleGenAI, Content } from '@google/genai';
import { LLMAdapter } from '../types';
import { config } from '../config';
import { logger } from '../services/logger';

const genAI = new GoogleGenAI({ apiKey: config.gemini.apiKey });

/** Lets handlers distinguish provider throttling from ordinary API failures. */
export class LLMRateLimitError extends Error {
  constructor() {
    super('Gemini rate limit reached');
    this.name = 'LLMRateLimitError';
  }
}

export const geminiAdapter: LLMAdapter = {
  async chat(params): Promise<string> {
    try {
      const history: Content[] = params.history.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));

      const chat = genAI.chats.create({
        model: config.gemini.model,
        history,
        config: {
          systemInstruction: params.systemPrompt,
        },
      });

      const result = await chat.sendMessage({ message: params.userMessage });
      const response = result.text;

      if (!response) {
        throw new Error('Gemini returned an empty response');
      }

      return response;
    } catch (err: any) {
      if (err?.status === 429 || err?.message?.includes('429')) {
        logger.warn('Gemini rate limit hit (429)');
        throw new LLMRateLimitError();
      }

      logger.error({ err }, 'Gemini API call failed');
      throw err;
    }
  },
};
