/**
 * Command: infogroup
 * Category: general
 * Shows group name, member count, creation date, and admin list.
 */

import { CommandHandler, CommandResult, CommandContext } from '../../types';
import { WASocket } from '@whiskeysockets/baileys';
import { logger } from '../../services/logger';

export const infoGroupHandler: CommandHandler = {
  name: 'infogroup',
  category: 'general',
  adminOnly: false,

  async execute(ctx: CommandContext): Promise<CommandResult> {
    const sock = (ctx as any).sock as WASocket;

    try {
      const metadata = await sock.groupMetadata(ctx.group.waGroupId);

      const admins = metadata.participants
        .filter((p) => p.admin === 'admin' || p.admin === 'superadmin')
        .map((p) => `@${p.id.split('@')[0]}`)
        .join(', ');

      const adminJids = metadata.participants
        .filter((p) => p.admin === 'admin' || p.admin === 'superadmin')
        .map((p) => p.id);

      const createdAt = metadata.creation
        ? new Date(metadata.creation * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : 'Unknown';

      const info = [
        '📋 *Group Info*',
        '',
        `📛 Name: ${metadata.subject}`,
        `👥 Members: ${metadata.participants.length}`,
        `📅 Created: ${createdAt}`,
        `👑 Admins: ${admins || 'None'}`,
        metadata.desc ? `\n📝 Description: ${metadata.desc}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      // We need to send mentions for admin tags, so send directly
      await sock.sendMessage(ctx.group.waGroupId, {
        text: info,
        mentions: adminJids,
      });

      return { reply: '', success: true };
    } catch (err) {
      logger.error({ err }, 'InfoGroup failed');
      return {
        reply: '❌ Failed to fetch group info.',
        success: false,
        error: String(err),
      };
    }
  },
};
