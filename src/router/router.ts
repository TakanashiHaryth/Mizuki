/**
 * Message router.
 * The central dispatcher: listens for messages, parses triggers, checks permissions
 * and cooldowns, dispatches to the right handler, and sends the reply.
 *
 * Handlers never touch the socket directly — they return a CommandResult and the
 * Router sends it. This keeps handlers unit-testable without a live connection.
 */

import { WASocket, proto, normalizeMessageContent } from '@whiskeysockets/baileys';
import { parseMessage } from './parser';
import { CommandHandler, CommandContext, CommandResult, MediaReply, PollReply, TextReply } from '../types';
import { isAdmin, isBotAdmin } from '../services/permission';
import {
  checkCooldown,
  recordUsage,
  consumeSendToken,
  consumeUserRateLimit,
} from '../services/rateLimit';
import { mediaQueue, MediaQueueFullError } from '../services/mediaQueue';
import { upsertUser } from '../data/repositories/userRepo';
import { upsertGroup, upsertGroupMember } from '../data/repositories/groupRepo';
import { logCommandUsage } from '../data/repositories/logRepo';
import { logger, maskJid } from '../services/logger';
import { config } from '../config';

// Import all command handlers
import { kickHandler } from '../handlers/admin/kick';
import { promoteHandler } from '../handlers/admin/promote';
import { demoteHandler } from '../handlers/admin/demote';
import { tagAllHandler } from '../handlers/admin/tagAll';
import { deleteHandler } from '../handlers/admin/delete';
import { infoBotHandler } from '../handlers/general/infoBot';
import { infoGroupHandler } from '../handlers/general/infoGroup';
import { infoMemberHandler } from '../handlers/general/infoMember';
import { helpHandler } from '../handlers/general/help';
import { pingHandler } from '../handlers/general/ping';
import { ownerHandler } from '../handlers/general/owner';
import { privacyHandler } from '../handlers/general/privacy';
import { flipCoinHandler } from '../handlers/minigame/flipCoin';
import { diceThrowHandler } from '../handlers/minigame/diceThrow';
import { stickerToImageHandler } from '../handlers/media/stickerToImage';
import { imageToStickerHandler } from '../handlers/media/imageToSticker';
import { gifToVideoHandler } from '../handlers/media/gifToVideo';
import { videoToGifHandler } from '../handlers/media/videoToGif';
import { aiChatHandler } from '../handlers/ai/chat';
import { forgetMeHandler } from '../handlers/ai/forgetMe';
import { pollHandler } from '../handlers/utility/poll';

/** Registry of all command handlers, keyed by command name */
const handlers = new Map<string, CommandHandler>();

/** All available handlers */
const allHandlers: CommandHandler[] = [
  kickHandler,
  promoteHandler,
  demoteHandler,
  tagAllHandler,
  deleteHandler,
  infoBotHandler,
  infoGroupHandler,
  infoMemberHandler,
  helpHandler,
  pingHandler,
  ownerHandler,
  privacyHandler,
  flipCoinHandler,
  diceThrowHandler,
  stickerToImageHandler,
  imageToStickerHandler,
  gifToVideoHandler,
  videoToGifHandler,
  aiChatHandler,
  forgetMeHandler,
  pollHandler,
];

// Register all handlers
for (const handler of allHandlers) {
  handlers.set(handler.name, handler);
}

// Backwards-compatible alias; hidden from help because infobot already includes uptime.
handlers.set('uptime', infoBotHandler);

/** Exported for the help command to enumerate all commands */
export { allHandlers };

/**
 * Extracts the text content from a Baileys message object.
 */
function extractMessageText(msg: proto.IWebMessageInfo): string {
  const m = normalizeMessageContent(msg.message);
  if (!m) return '';

  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    ''
  );
}

/**
 * Sends a text or media reply to the group.
 */
async function sendReply(
  sock: WASocket,
  jid: string,
  reply: string | TextReply | MediaReply | PollReply,
  quotedMsg?: proto.IWebMessageInfo
): Promise<void> {
  if (typeof reply === 'string' && reply.trim().length === 0) return;
  if (typeof reply !== 'string' && reply.type === 'text' && reply.text.trim().length === 0) return;

  // Global send-rate check
  if (!consumeSendToken()) {
    logger.warn('Send throttled by global rate limit');
    return;
  }

  if (typeof reply === 'string') {
    await sock.sendMessage(jid, { text: reply }, { quoted: quotedMsg });
  } else {
    switch (reply.type) {
      case 'text':
        await sock.sendMessage(
          jid,
          { text: reply.text, mentions: reply.mentions },
          { quoted: quotedMsg }
        );
        break;
      case 'image':
        await sock.sendMessage(
          jid,
          { image: reply.buffer, caption: reply.caption, mimetype: reply.mimetype as any },
          { quoted: quotedMsg }
        );
        break;
      case 'video':
        await sock.sendMessage(
          jid,
          {
            video: reply.buffer,
            caption: reply.caption,
            mimetype: reply.mimetype as any,
            gifPlayback: reply.gifPlayback,
          },
          { quoted: quotedMsg }
        );
        break;
      case 'sticker':
        await sock.sendMessage(
          jid,
          { sticker: reply.buffer },
          { quoted: quotedMsg }
        );
        break;
      case 'poll':
        await sock.sendMessage(
          jid,
          {
            poll: {
              name: reply.name,
              values: reply.options,
              selectableCount: reply.selectableCount,
            },
          },
          { quoted: quotedMsg }
        );
        break;
    }
  }
}

async function sendStatusReaction(
  sock: WASocket,
  jid: string,
  msg: proto.IWebMessageInfo,
  emoji: '⏳' | '✅' | '❌'
): Promise<void> {
  try {
    await sock.sendMessage(jid, { react: { text: emoji, key: msg.key } });
  } catch (err) {
    logger.warn(
      { err, messageId: msg.key.id, group: maskJid(jid), emoji },
      'Could not send command status reaction'
    );
  }
}

/**
 * Main message handler. Called for every incoming message event.
 * This is the function you wire up to Baileys' `messages.upsert` event.
 */
export async function handleMessage(
  sock: WASocket,
  msg: proto.IWebMessageInfo
): Promise<void> {
  let processingReactionStarted = false;
  try {
    // Ignore non-group messages, status broadcasts, and bot's own messages
    const remoteJid = msg.key.remoteJid;
    if (!remoteJid || !remoteJid.endsWith('@g.us')) return;
    if (msg.key.fromMe) return;
    if (!msg.message) return;

    const text = extractMessageText(msg);
    if (!text) return;

    // Parse the message for triggers
    const parsed = parseMessage(text);
    if (!parsed.triggered) return;

    const senderJid = msg.key.participant || msg.key.remoteJid || '';
    const groupJid = remoteJid;

    // Auto-register user and group in DB (fire-and-forget style, but await for IDs)
    const pushName = msg.pushName || undefined;
    const userId = await upsertUser(senderJid, pushName);
    const groupId = await upsertGroup(groupJid);
    await upsertGroupMember(groupId, userId);

    // Find the matching handler
    const handler = handlers.get(parsed.command);
    if (!handler) {
      await sendReply(
        sock,
        groupJid,
        `❌ Unknown command *${parsed.command}*. Type *${config.bot.prefix}help* to see available commands.`,
        msg
      );
      return;
    }

    // Admin-only check: verify sender's LIVE admin status
    if (handler.adminOnly) {
      const senderIsAdmin = await isAdmin(sock, groupJid, senderJid);
      if (!senderIsAdmin) {
        await sendReply(sock, groupJid, '🔒 This command is for admins only.', msg);
        return;
      }

      // Also check if the bot itself is admin (needed for kick/promote/demote)
      const botIsAdmin = await isBotAdmin(sock, groupJid);
      if (!botIsAdmin) {
        await sendReply(
          sock,
          groupJid,
          '⚠️ I need to be a group admin to do this. Please promote me first!',
          msg
        );
        return;
      }
    }

    // Cooldown check
    if (handler.cooldownSeconds && handler.cooldownSeconds > 0) {
      const { onCooldown, remainingSeconds } = await checkCooldown(
        groupId,
        handler.name,
        handler.cooldownSeconds
      );
      if (onCooldown) {
        const mins = Math.floor(remainingSeconds / 60);
        const secs = remainingSeconds % 60;
        const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
        await sendReply(
          sock,
          groupJid,
          `⏳ Command *${handler.name}* is on cooldown. Try again in ${timeStr}.`,
          msg
        );
        return;
      }
    }

    // Persistent per-user protection for AI and media processing.
    if (handler.userRateLimit) {
      const limit = await consumeUserRateLimit(
        userId,
        handler.category,
        handler.userRateLimit.maxUses,
        handler.userRateLimit.windowSeconds
      );
      if (!limit.allowed) {
        await sendReply(
          sock,
          groupJid,
          `⏳ Had penggunaan dicapai. Cuba lagi dalam ${limit.remainingSeconds} saat.`,
          msg
        );
        return;
      }
    }

    // Build context
    const ctx: CommandContext = {
      message: msg,
      args: parsed.isWakeWord ? parsed.args : parsed.args,
      sender: { waJid: senderJid, userId },
      group: { waGroupId: groupJid, groupId },
      rawText: parsed.rawText,
    };

    // Attach the socket to the context for handlers that need it (admin commands)
    (ctx as any).sock = sock;

    logger.info(
      { command: handler.name, sender: maskJid(senderJid), group: maskJid(groupJid) },
      'Executing command'
    );

    if (handler.processingReaction) {
      processingReactionStarted = true;
      await sendStatusReaction(sock, groupJid, msg, '⏳');
    }

    // Execute the handler
    let result: CommandResult;
    try {
      result = handler.category === 'media'
        ? await mediaQueue.run(() => handler.execute(ctx))
        : await handler.execute(ctx);
    } catch (err) {
      if (!(err instanceof MediaQueueFullError)) throw err;
      result = {
        reply: '⏳ Mizuki sedang memproses terlalu banyak media. Cuba lagi sebentar nanti.',
        success: false,
        error: err.message,
      };
    }

    // Record cooldown if the command has one and succeeded
    if (handler.cooldownSeconds && handler.cooldownSeconds > 0 && result.success) {
      await recordUsage(groupId, handler.name);
    }

    // Send the reply
    await sendReply(sock, groupJid, result.reply, msg);

    if (handler.processingReaction) {
      await sendStatusReaction(sock, groupJid, msg, result.success ? '✅' : '❌');
      processingReactionStarted = false;
    }

    // Log command usage (always, regardless of success)
    await logCommandUsage(groupId, userId, handler.name);

    if (!result.success && result.error) {
      logger.warn({ command: handler.name, error: result.error }, 'Command failed');
    }
  } catch (err) {
    // Top-level safety net — never let a handler crash the bot
    logger.error(
      {
        err,
        messageId: msg.key.id,
        group: maskJid(msg.key.remoteJid),
        sender: maskJid(msg.key.participant),
      },
      'Unhandled error in message handler'
    );

    try {
      const jid = msg.key.remoteJid;
      if (jid) {
        if (processingReactionStarted) {
          await sendStatusReaction(sock, jid, msg, '❌');
          processingReactionStarted = false;
        }
        await sendReply(sock, jid, '❌ Something went wrong. Please try again later.', msg);
      }
    } catch {
      // If even the error reply fails, just log and move on
    }
  }
}
