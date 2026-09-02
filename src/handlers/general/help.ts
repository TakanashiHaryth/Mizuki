/**
 * Command: help
 * Category: general
 * Lists all available commands grouped by category using interactive list message.
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

    const sections = [];

    for (const cat of categoryOrder) {
      const handlers = categories.get(cat);
      if (!handlers) continue;

      const emoji = categoryEmojis[cat] || '📌';
      const rows = handlers.map((h) => ({
        title: `${config.bot.prefix} ${h.name}${h.adminOnly ? ' 🔐' : ''}`,
        description: h.category === 'ai' ? 'Chat with AI' : `${cat} command`,
        rowId: `${config.bot.prefix} ${h.name}`,
      }));

      sections.push({
        title: `${emoji} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
        rows,
      });
    }

    await (ctx as any).sock.sendMessage(ctx.group.waGroupId, {
      sections,
      buttonText: '📋 View Commands',
      title: '📖 Mizuki Commands',
      footer: `Prefix: ${config.bot.prefix}  |  Wake-word: "Mizuki"`,
      text: 'Select a category to view commands',
    }, { quoted: ctx.message });

    return { reply: '', success: true };
  },
};
