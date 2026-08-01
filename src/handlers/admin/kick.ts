/**
 * Command: kick
 * Category: admin
 * Admin-only: yes
 * Removes a target member from the group.
 */

import { CommandHandler, CommandResult, CommandContext } from '../../types';
import { logAdminAction } from '../../data/repositories/logRepo';
import { upsertUser } from '../../data/repositories/userRepo';
import { removeGroupMember } from '../../data/repositories/groupRepo';
import { logger, maskJid } from '../../services/logger';
import { WASocket } from '@whiskeysockets/baileys';
import { config } from '../../config';

export const kickHandler: CommandHandler = {
  name: 'kick',
  category: 'admin',
  adminOnly: true,

  async execute(ctx: CommandContext): Promise<CommandResult> {
    const sock = (ctx as any).sock as WASocket;

    // Resolve target JID from mentions or quoted message
    const msg = ctx.message;
    const mentionedJids =
      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const quotedParticipant =
      msg.message?.extendedTextMessage?.contextInfo?.participant;

    const targetJid = mentionedJids[0] || quotedParticipant;

    if (!targetJid) {
      return {
        reply: `⚠️ Please mention or reply to the member you want to kick.\nUsage: *${config.bot.prefix}kick @member*`,
        success: false,
        error: 'No target specified',
      };
    }

    // Don't let admins kick the bot itself
    const botJid = sock.user?.id?.replace(/:\d+/, '') || '';
    if (targetJid === botJid || targetJid === sock.user?.id) {
      return { reply: "😅 I can't kick myself!", success: false };
    }

    try {
      await sock.groupParticipantsUpdate(ctx.group.waGroupId, [targetJid], 'remove');

      // Log the admin action
      const targetUserId = await upsertUser(targetJid);
      await logAdminAction(ctx.group.groupId, ctx.sender.userId, targetUserId, 'kick');
      await removeGroupMember(ctx.group.groupId, targetUserId);

      return { reply: `✅ Member has been removed from the group.`, success: true };
    } catch (err) {
      logger.error({ err, target: maskJid(targetJid) }, 'Kick failed');
      return {
        reply: '❌ Failed to kick the member. They might be an admin or I lack permissions.',
        success: false,
        error: String(err),
      };
    }
  },
};
