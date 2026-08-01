/**
 * Command: infobot
 * Category: general
 * Shows bot version, uptime, and connection status.
 */

import { CommandHandler, CommandResult, CommandContext } from '../../types';
import { config } from '../../config';
import { isBotAdmin } from '../../services/permission';
import { WASocket } from '@whiskeysockets/baileys';

const startTime = Date.now();

export const infoBotHandler: CommandHandler = {
  name: 'infobot',
  category: 'general',
  adminOnly: false,

  async execute(ctx: CommandContext): Promise<CommandResult> {
    const sock = (ctx as any).sock as WASocket;
    const botIsAdmin = await isBotAdmin(sock, ctx.group.waGroupId);
    const uptimeMs = Date.now() - startTime;
    const hours = Math.floor(uptimeMs / 3600000);
    const minutes = Math.floor((uptimeMs % 3600000) / 60000);
    const seconds = Math.floor((uptimeMs % 60000) / 1000);

    const info = [
      '🤖 *Mizuki Bot Info*',
      '',
      `📌 Version: ${config.bot.version}`,
      `⏱️ Uptime: ${hours}h ${minutes}m ${seconds}s`,
      `🧠 AI Model: ${config.gemini.model}`,
      `💬 Memory Window: ${config.bot.memoryWindow} exchanges`,
      `👑 Group Admin: ${botIsAdmin ? 'Yes' : 'No'}`,
      `⚡ Status: Online`,
    ].join('\n');

    return { reply: info, success: true };
  },
};
