/** Freeform AI chat with per-user, per-group rolling memory. */

import { CommandHandler, CommandResult, CommandContext } from '../../types';
import { aiAdapter, configuredAIProviders } from '../../llm/aiAdapter';
import { LLMRateLimitError, LLMTimeoutError } from '../../llm/providerErrors';
import { loadMemory, addMemoryExchange, pruneMemory } from '../../data/repositories/memoryRepo';
import { isMemoryOptedOut } from '../../data/repositories/userRepo';
import { config } from '../../config';
import { logger } from '../../services/logger';
import { getGroupPersonality } from '../../data/repositories/groupRepo';
import { buildMizukiSystemPrompt } from '../../services/personality';

export const aiChatHandler: CommandHandler = {
  name: 'ai',
  category: 'ai',
  adminOnly: false,
  userRateLimit: config.rateLimits.ai,

  async execute(ctx: CommandContext): Promise<CommandResult> {
    const userMessage = ctx.args.join(' ').trim();

    if (!userMessage) {
      return {
        reply: `💬 Hai! Tanya Mizuki apa-apa dengan *Mizuki, [soalan]* atau *${config.bot.prefix} ai [soalan]*.`,
        success: true,
      };
    }

    if (configuredAIProviders.length === 0) {
      return {
        reply: '⚠️ Fungsi AI belum dikonfigurasi. Admin perlu menetapkan GEMINI_API_KEY atau OPENROUTER_API_KEY.',
        success: false,
        error: 'Missing AI provider API key',
      };
    }

    try {
      const [optedOut, customPersonality] = await Promise.all([
        isMemoryOptedOut(ctx.sender.userId),
        getGroupPersonality(ctx.group.groupId),
      ]);
      let history: { role: 'user' | 'assistant'; content: string }[] = [];

      if (!optedOut) {
        const memRows = await loadMemory(ctx.sender.userId, ctx.group.groupId);
        history = memRows.map((row) => ({ role: row.role, content: row.content }));
      }

      const response = await aiAdapter.chat({
        systemPrompt: buildMizukiSystemPrompt(customPersonality),
        history,
        userMessage,
      });

      if (!optedOut) {
        try {
          await addMemoryExchange(ctx.sender.userId, ctx.group.groupId, userMessage, response);
          await pruneMemory(ctx.sender.userId, ctx.group.groupId);
        } catch (err) {
          logger.warn({ err }, 'AI reply succeeded but conversation memory could not be saved');
        }
      }

      return { reply: response, success: true };
    } catch (err) {
      if (err instanceof LLMRateLimitError) {
        return {
          reply: 'Mizuki agak sibuk sekarang 😅 Penyedia AI mencapai had. Cuba lagi sebentar nanti.',
          success: false,
          error: err.message,
        };
      }

      if (err instanceof LLMTimeoutError) {
        return {
          reply: 'Penyedia AI mengambil masa terlalu lama untuk menjawab. Cuba sekali lagi sebentar nanti.',
          success: false,
          error: err.message,
        };
      }

      logger.error({ err }, 'AI chat failed');
      return {
        reply: '❌ Mizuki menghadapi masalah untuk menjawab. Cuba lagi sebentar nanti.',
        success: false,
        error: String(err),
      };
    }
  },
};
