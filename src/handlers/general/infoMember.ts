/**
 * Command: infomember
 * Category: general
 * Shows info about a mentioned/quoted member (name, role, join date).
 */

import { CommandHandler, CommandResult, CommandContext } from '../../types';
import { WASocket } from '@whiskeysockets/baileys';
import { getUserByJid } from '../../data/repositories/userRepo';
import { logger } from '../../services/logger';

export const infoMemberHandler: CommandHandler = {
  name: 'infomember',
  category: 'general',
  adminOnly: false,

  async execute(ctx: CommandContext): Promise<CommandResult> {
    const sock = (ctx as any).sock as WASocket;

    const msg = ctx.message;
    const mentionedJids =
      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const quotedParticipant =
      msg.message?.extendedTextMessage?.contextInfo?.participant;

    const targetJid = mentionedJids[0] || quotedParticipant || ctx.sender.waJid;

    try {
      const metadata = await sock.groupMetadata(ctx.group.waGroupId);
      const participant = metadata.participants.find((p: any) => p.id === targetJid);

      if (!participant) {
        return { reply: '⚠️ Member not found in this group.', success: false };
      }

      const user = await getUserByJid(targetJid);
      const role =
        participant.admin === 'superadmin'
          ? 'Super Admin'
          : participant.admin === 'admin'
            ? 'Admin'
            : 'Member';

      const firstSeen = user?.first_seen
        ? new Date(user.first_seen).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : 'Unknown';

      const info = [
        '👤 *Member Info*',
        '',
        `📛 Name: ${user?.display_name || 'Unknown'}`,
        `📱 Number: +${targetJid.split('@')[0]}`,
        `👑 Role: ${role}`,
        `📅 First seen: ${firstSeen}`,
      ].join('\n');

      return { reply: info, success: true };
    } catch (err) {
      logger.error({ err }, 'InfoMember failed');
      return {
        reply: '❌ Failed to fetch member info.',
        success: false,
        error: String(err),
      };
    }
  },
};
