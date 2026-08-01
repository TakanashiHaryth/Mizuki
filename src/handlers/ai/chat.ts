/** Freeform Gemini chat with per-user, per-group rolling memory. */

import { CommandHandler, CommandResult, CommandContext } from '../../types';
import { geminiAdapter, LLMRateLimitError } from '../../llm/geminiAdapter';
import { loadMemory, addMemory, pruneMemory } from '../../data/repositories/memoryRepo';
import { isMemoryOptedOut } from '../../data/repositories/userRepo';
import { config } from '../../config';
import { logger } from '../../services/logger';

export const aiChatHandler: CommandHandler = {
  name: 'ai',
  category: 'ai',
  adminOnly: false,
  userRateLimit: config.rateLimits.ai,

  async execute(ctx: CommandContext): Promise<CommandResult> {
    const userMessage = ctx.args.join(' ').trim();

    if (!userMessage) {
      return {
        reply: `💬 Hai! Tanya Mizuki apa-apa dengan *Mizuki, [soalan]* atau *${config.bot.prefix}ai [soalan]*.`,
        success: true,
      };
    }

    if (userMessage.length > config.ai.maxInputCharacters) {
      return {
        reply: `⚠️ Mesej terlalu panjang. Hadnya ${config.ai.maxInputCharacters} aksara.`,
        success: false,
        error: 'AI input exceeds configured character limit',
      };
    }

    if (!config.gemini.apiKey) {
      return {
        reply: '⚠️ Fungsi AI belum dikonfigurasi. Admin perlu menetapkan GEMINI_API_KEY.',
        success: false,
        error: 'Missing GEMINI_API_KEY',
      };
    }

    try {
      const optedOut = await isMemoryOptedOut(ctx.sender.userId);
      let history: { role: 'user' | 'assistant'; content: string }[] = [];

      if (!optedOut) {
        const memRows = await loadMemory(ctx.sender.userId, ctx.group.groupId);
        history = memRows.map((row) => ({ role: row.role, content: row.content }));
      }

      const response = await geminiAdapter.chat({
        systemPrompt: config.bot.persona,
        history,
        userMessage,
      });

      if (!optedOut) {
        await addMemory(ctx.sender.userId, ctx.group.groupId, 'user', userMessage);
        await addMemory(ctx.sender.userId, ctx.group.groupId, 'assistant', response);
        await pruneMemory(ctx.sender.userId, ctx.group.groupId);
      }

      return { reply: response, success: true };
    } catch (err) {
      if (err instanceof LLMRateLimitError) {
        return {
          reply: 'Mizuki agak sibuk sekarang 😅 Cuba lagi sebentar nanti.',
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
