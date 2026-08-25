/** Command: togif (video to animated WhatsApp sticker). */

import { CommandHandler, CommandResult, CommandContext } from '../../types';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { videoToAnimatedSticker, validateVideoSize } from '../../media/videoProcessor';
import { logger } from '../../services/logger';
import { config } from '../../config';
import { isDeclaredFileSizeAllowed, resolveVideoMedia } from '../../media/messageResolver';

export const videoToGifHandler: CommandHandler = {
  name: 'togif',
  category: 'media',
  adminOnly: false,
  processingReaction: true,

  async execute(ctx: CommandContext): Promise<CommandResult> {
    const resolved = resolveVideoMedia(ctx.message, 'video');
    if (!resolved) {
      return {
        reply: `⚠️ Hantar atau reply *video* dengan *${config.bot.prefix} togif* untuk membuat animated sticker.`,
        success: false,
        error: 'No video found',
      };
    }

    if (
      resolved.videoMessage?.seconds &&
      resolved.videoMessage.seconds > config.media.maxVideoDurationSeconds
    ) {
      return {
        reply: `⚠️ Video terlalu panjang (maksimum ${config.media.maxVideoDurationSeconds} saat).`,
        success: false,
      };
    }

    const maxBytes = config.media.maxFileSizeMB * 1024 * 1024;
    const declaredSize = resolved.videoMessage?.fileLength ?? resolved.documentMessage?.fileLength;
    if (!isDeclaredFileSizeAllowed(declaredSize, maxBytes)) {
      return {
        reply: `⚠️ Video terlalu besar (maksimum ${config.media.maxFileSizeMB}MB).`,
        success: false,
      };
    }

    try {
      const mediaMsg = { ...ctx.message, message: resolved.content };
      const buffer = await downloadMediaMessage(mediaMsg as any, 'buffer', {}) as Buffer;
      if (!validateVideoSize(buffer)) {
        return {
          reply: `⚠️ Video terlalu besar (maksimum ${config.media.maxFileSizeMB}MB).`,
          success: false,
        };
      }

      return {
        reply: {
          type: 'sticker',
          buffer: await videoToAnimatedSticker(buffer, resolved.videoMessage?.seconds ?? undefined),
          mimetype: 'image/webp',
        },
        success: true,
      };
    } catch (err) {
      logger.error({ err }, 'VideoToAnimatedSticker failed');
      return {
        reply: `❌ ${err instanceof Error ? err.message : 'Video gagal ditukar kepada animated sticker.'}`,
        success: false,
        error: String(err),
      };
    }
  },
};
