/**
 * Command: tagall
 * Category: admin
 * Admin-only: yes
 * Mentions all members in the group. Rate-limited to 1 use / 10 min / group.
 */

import { CommandHandler, CommandResult, CommandContext } from '../../types';
import { logAdminAction } from '../../data/repositories/logRepo';
import { config } from '../../config';
import { logger } from '../../services/logger';
import { WASocket } from '@whiskeysockets/baileys';

export const tagAllHandler: CommandHandler = {
  name: 'tagall',
  category: 'admin',
  adminOnly: true,
  cooldownSeconds: config.cooldowns.tagAll,

  async execute(ctx: CommandContext): Promise<CommandResult> {
    const sock = (ctx as any).sock as WASocket;

    try {
      const metadata = await sock.groupMetadata(ctx.group.waGroupId);
      const participants = metadata.participants;

      if (participants.length === 0) {
        return { reply: '⚠️ No members found in the group.', success: false };
      }

      // Build the mention list
      const mentions = participants.map((p) => p.id);
      const messageText = ctx.args.length > 0
        ? `📢 *${ctx.args.join(' ')}*\n\n` + participants.map((p) => `@${p.id.split('@')[0]}`).join(' ')
        : '📢 *Attention everyone!*\n\n' + participants.map((p) => `@${p.id.split('@')[0]}`).join(' ');

      // Send directly via socket since we need the mentions array
      await sock.sendMessage(ctx.group.waGroupId, {
        text: messageText,
        mentions,
      });

      await logAdminAction(ctx.group.groupId, ctx.sender.userId, null, 'tagall');

      // Return empty string since we already sent the message
      return { reply: '', success: true };
    } catch (err) {
      logger.error({ err }, 'TagAll failed');
      return {
        reply: '❌ Failed to tag all members.',
        success: false,
        error: String(err),
      };
    }
  },
};
