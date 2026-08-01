/** Command: togif (video to WhatsApp GIF-style MP4). */

import { CommandHandler, CommandResult, CommandContext } from '../../types';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { videoToGif, validateVideoSize } from '../../media/videoProcessor';
import { logger } from '../../services/logger';
import { config } from '../../config';
import { isDeclaredFileSizeAllowed, resolveVideoMedia } from '../../media/messageResolver';

export const videoToGifHandler: CommandHandler = {
  name: 'togif',
  category: 'media',
  adminOnly: false,
  userRateLimit: config.rateLimits.media,

  async execute(ctx: CommandContext): Promise<CommandResult> {
    const resolved = resolveVideoMedia(ctx.message, 'video');
    if (!resolved) {
      return {
        reply: `⚠️ Hantar atau reply *video* dengan *${config.bot.prefix}togif*.`,
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
      return { reply: `⚠️ Video terlalu besar (maksimum ${config.media.maxFileSizeMB}MB).`, success: false };
    }

    try {
      const mediaMsg = { ...ctx.message, message: resolved.content };
      const buffer = await downloadMediaMessage(mediaMsg as any, 'buffer', {}) as Buffer;
      if (!validateVideoSize(buffer)) {
        return { reply: `⚠️ Video terlalu besar (maksimum ${config.media.maxFileSizeMB}MB).`, success: false };
      }

      const result = await videoToGif(buffer);
      return {
        reply: {
          type: 'video',
          buffer: result,
          mimetype: 'video/mp4',
          caption: '🎞️ Video ditukar kepada GIF',
          gifPlayback: true,
        },
        success: true,
      };
    } catch (err) {
      logger.error({ err }, 'VideoToGif failed');
      return { reply: '❌ Video gagal ditukar. Pastikan ffmpeg dipasang.', success: false, error: String(err) };
    }
  },
};
