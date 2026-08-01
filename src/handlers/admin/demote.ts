/**
 * Command: demote
 * Category: admin
 * Admin-only: yes
 * Demotes a target admin back to regular member.
 */

import { CommandHandler, CommandResult, CommandContext } from '../../types';
import { logAdminAction } from '../../data/repositories/logRepo';
import { upsertUser } from '../../data/repositories/userRepo';
import { upsertGroupMember } from '../../data/repositories/groupRepo';
import { logger, maskJid } from '../../services/logger';
import { WASocket } from '@whiskeysockets/baileys';
import { config } from '../../config';

export const demoteHandler: CommandHandler = {
  name: 'demote',
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
        reply: `⚠️ Please mention or reply to the admin you want to demote.\nUsage: *${config.bot.prefix}demote @member*`,
        success: false,
        error: 'No target specified',
      };
    }

    try {
      await sock.groupParticipantsUpdate(ctx.group.waGroupId, [targetJid], 'demote');

      const targetUserId = await upsertUser(targetJid);
      await logAdminAction(ctx.group.groupId, ctx.sender.userId, targetUserId, 'demote');
      await upsertGroupMember(ctx.group.groupId, targetUserId, 'member');

      return { reply: '✅ Admin has been demoted to regular member.', success: true };
    } catch (err) {
      logger.error({ err, target: maskJid(targetJid) }, 'Demote failed');
      return {
        reply: '❌ Failed to demote the member.',
        success: false,
        error: String(err),
      };
    }
  },
};
