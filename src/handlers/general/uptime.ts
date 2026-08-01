/**
 * Command: uptime
 * Category: general
 * Shows how long the current Mizuki process has been running.
 */

import { CommandHandler, CommandContext, CommandResult } from '../../types';

export const uptimeHandler: CommandHandler = {
  name: 'uptime',
  category: 'general',
  adminOnly: false,

  async execute(_ctx: CommandContext): Promise<CommandResult> {
    const totalSeconds = Math.floor(process.uptime());
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days} hari`);
    if (hours > 0 || days > 0) parts.push(`${hours} jam`);
    if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes} minit`);
    parts.push(`${seconds} saat`);

    return {
      reply: `⏱️ Mizuki telah aktif selama *${parts.join(', ')}*.`,
      success: true,
    };
  },
};
