/**
 * Command: promote
 * Category: admin
 * Admin-only: yes
 * Promotes a target member to group admin.
 */

import { CommandHandler, CommandResult, CommandContext } from '../../types';
import { logAdminAction } from '../../data/repositories/logRepo';
import { upsertUser } from '../../data/repositories/userRepo';
import { upsertGroupMember } from '../../data/repositories/groupRepo';
import { logger, maskJid } from '../../services/logger';
import { WASocket } from '@whiskeysockets/baileys';
import { config } from '../../config';

export const promoteHandler: CommandHandler = {
  name: 'promote',
  category: 'admin',
  adminOnly: true,

  async execute(ctx: CommandContext): Promise<CommandResult> {
    const sock = (ctx as any).sock as WASocket;

    const msg = ctx.message;
    const mentionedJids =
      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const quotedParticipant =
      msg.message?.extendedTextMessage?.contextInfo?.participant;

    const targetJid = mentionedJids[0] || quotedParticipant;

    if (!targetJid) {
      return {
        reply: `⚠️ Please mention or reply to the member you want to promote.\nUsage: *${config.bot.prefix}promote @member*`,
        success: false,
        error: 'No target specified',
      };
    }

    try {
      await sock.groupParticipantsUpdate(ctx.group.waGroupId, [targetJid], 'promote');

      const targetUserId = await upsertUser(targetJid);
      await logAdminAction(ctx.group.groupId, ctx.sender.userId, targetUserId, 'promote');
      await upsertGroupMember(ctx.group.groupId, targetUserId, 'admin');

      return { reply: '✅ Member has been promoted to admin.', success: true };
    } catch (err) {
      logger.error({ err, target: maskJid(targetJid) }, 'Promote failed');
      return {
        reply: '❌ Failed to promote the member.',
        success: false,
        error: String(err),
      };
    }
  },
};
