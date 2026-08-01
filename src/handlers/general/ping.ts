/**
 * Command: ping
 * Category: general
 * Returns round-trip latency in milliseconds.
 */

import { CommandHandler, CommandResult, CommandContext } from '../../types';

export const pingHandler: CommandHandler = {
  name: 'ping',
  category: 'general',
  adminOnly: false,

  async execute(ctx: CommandContext): Promise<CommandResult> {
    const timestamp = ctx.message.messageTimestamp;
    let latency = 0;

    if (timestamp) {
      const msgTime = typeof timestamp === 'number' ? timestamp * 1000 : Number(timestamp) * 1000;
      latency = Date.now() - msgTime;
    }

    return {
      reply: `🏓 Pong! *${latency}ms*`,
      success: true,
    };
  },
};
