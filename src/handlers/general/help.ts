/**
 * Command: help
 * Category: general
 * Lists all available commands grouped by category.
 */

import { CommandHandler, CommandResult, CommandContext } from '../../types';
import { config } from '../../config';

// We'll import the handler registry at runtime to avoid circular deps
export const helpHandler: CommandHandler = {
  name: 'help',
  category: 'general',
  adminOnly: false,

  async execute(ctx: CommandContext): Promise<CommandResult> {
    // Lazy import to avoid circular dependency with router
    const { allHandlers } = await import('../../router/router');

    const categories = new Map<string, CommandHandler[]>();

    for (const handler of allHandlers) {
      const cat = handler.category;
      if (!categories.has(cat)) categories.set(cat, []);
      categories.get(cat)!.push(handler);
    }

    const categoryEmojis: Record<string, string> = {
      admin: '🔒',
      general: '📋',
      utility: '🧰',
      minigame: '🎮',
      media: '🖼️',
      ai: '🧠',
    };

    const categoryOrder = ['general', 'admin', 'utility', 'ai', 'minigame', 'media'];

    let text = '📖 *Mizuki Commands*\n';
    text += `_Prefix: ${config.bot.prefix} or say "Mizuki"_\n`;

    for (const cat of categoryOrder) {
      const handlers = categories.get(cat);
      if (!handlers) continue;

      const emoji = categoryEmojis[cat] || '📌';
      text += `\n${emoji} *${cat.charAt(0).toUpperCase() + cat.slice(1)}*\n`;

      for (const h of handlers) {
        const adminTag = h.adminOnly ? ' 🔐' : '';
        text += `  • ${config.bot.prefix} ${h.name}${adminTag}\n`;
      }
    }

    text += '\n_🔐 = Admin only_';
    text += '\n_Say "Mizuki, [your message]" for AI chat!_';
    text += `\n_Privasi & data: ${config.bot.prefix} privacy_`;

    return { reply: text, success: true };
  },
};
