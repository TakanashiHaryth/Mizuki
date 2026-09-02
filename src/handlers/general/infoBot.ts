/** Command: infobot — status, configuration and process uptime. */

import { CommandHandler, CommandResult, CommandContext } from '../../types';
import { config } from '../../config';
import { isBotAdmin } from '../../services/permission';
import { WASocket } from '@whiskeysockets/baileys';
import { configuredAIProviders } from '../../llm/aiAdapter';

function formatUptime(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} hari`);
  if (hours > 0 || days > 0) parts.push(`${hours} jam`);
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes} minit`);
  parts.push(`${seconds} saat`);
  return parts.join(', ');
}

export const infoBotHandler: CommandHandler = {
  name: 'infobot',
  category: 'general',
  adminOnly: false,

  async execute(ctx: CommandContext): Promise<CommandResult> {
    const sock = (ctx as any).sock as WASocket;
    const botIsAdmin = await isBotAdmin(sock, ctx.group.waGroupId);
    const uptime = formatUptime(Math.floor(process.uptime()));
    const aiModels = configuredAIProviders.map(({ name, model }) => `${name}: ${model}`).join(' → ');

    return {
      reply: [
        '🤖 *Maklumat Mizuki*',
        '',
        `📌 Versi: ${config.bot.version}`,
        `⏱️ Uptime: ${uptime}`,
        `🧠 Model AI: ${aiModels || 'Belum dikonfigurasi'}`,
        `💬 Memori AI: ${config.bot.memoryWindow} pertukaran`,
        `🔧 Prefix: ${config.bot.prefix}`,
        `👑 Admin kumpulan: ${botIsAdmin ? 'Ya' : 'Tidak'}`,
        '⚡ Status: Online',
      ].join('\n'),
      success: true,
    };
  },
};
