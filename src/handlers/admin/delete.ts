/**
 * Command: delete
 * Category: admin
 * Deletes a quoted group message for everyone.
 */

import {
  areJidsSameUser,
  WASocket,
} from '@whiskeysockets/baileys';
import { CommandHandler, CommandContext, CommandResult } from '../../types';
import { logger } from '../../services/logger';
import { config } from '../../config';

export const deleteHandler: CommandHandler = {
  name: 'delete',
  category: 'admin',
  adminOnly: true,

  async execute(ctx: CommandContext): Promise<CommandResult> {
    const sock = (ctx as any).sock as WASocket;
    const contextInfo = ctx.message.message?.extendedTextMessage?.contextInfo;
    const messageId = contextInfo?.stanzaId;

    if (!messageId) {
      return {
        reply: `⚠️ Reply pada mesej yang mahu dipadam dengan *${config.bot.prefix} delete*.`,
        success: false,
        error: 'No quoted message found',
      };
    }

    const participant = contextInfo?.participant;
    const bot = sock.user;
    const botJids = [bot?.id, bot?.jid, bot?.lid];
    const fromMe = botJids.some(
      (botJid) =>
        !!botJid &&
        !!participant &&
        (botJid === participant || areJidsSameUser(botJid, participant))
    );

    try {
      await sock.sendMessage(ctx.group.waGroupId, {
        delete: {
          remoteJid: ctx.group.waGroupId,
          fromMe,
          id: messageId,
          participant,
        },
      });

      return { reply: '✅ Mesej telah dipadam.', success: true };
    } catch (err) {
      logger.error({ err, messageId }, 'Delete message failed');
      return {
        reply:
          '❌ Gagal memadam mesej. Pastikan Mizuki ialah admin dan mesej masih boleh dipadam oleh WhatsApp.',
        success: false,
        error: String(err),
      };
    }
  },
};
