/** Command: tovideo (GIF to MP4 video). */

import { CommandHandler, CommandResult, CommandContext } from '../../types';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { gifToVideo, validateVideoSize } from '../../media/videoProcessor';
import { logger } from '../../services/logger';
import { config } from '../../config';
import { isDeclaredFileSizeAllowed, resolveVideoMedia } from '../../media/messageResolver';

export const gifToVideoHandler: CommandHandler = {
  name: 'tovideo',
  category: 'media',
  adminOnly: false,
  userRateLimit: config.rateLimits.media,
  processingReaction: true,

  async execute(ctx: CommandContext): Promise<CommandResult> {
    const resolved = resolveVideoMedia(ctx.message, 'gif');
    if (!resolved) {
      return {
        reply: `⚠️ Hantar atau reply *GIF* dengan *${config.bot.prefix}tovideo*.`,
        success: false,
        error: 'No GIF found',
      };
    }

    const maxBytes = config.media.maxFileSizeMB * 1024 * 1024;
    const declaredSize = resolved.videoMessage?.fileLength ?? resolved.documentMessage?.fileLength;
    if (!isDeclaredFileSizeAllowed(declaredSize, maxBytes)) {
      return { reply: `⚠️ Fail terlalu besar (maksimum ${config.media.maxFileSizeMB}MB).`, success: false };
    }

    try {
      const mediaMsg = { ...ctx.message, message: resolved.content };
      const buffer = await downloadMediaMessage(mediaMsg as any, 'buffer', {}) as Buffer;

      if (!validateVideoSize(buffer)) {
        return { reply: `⚠️ Fail terlalu besar (maksimum ${config.media.maxFileSizeMB}MB).`, success: false };
      }

      const result = await gifToVideo(buffer);
      return {
        reply: { type: 'video', buffer: result, mimetype: 'video/mp4', caption: '🎬 GIF ditukar kepada video' },
        success: true,
      };
    } catch (err) {
      logger.error({ err }, 'GifToVideo failed');
      return { reply: '❌ GIF gagal ditukar. Pastikan ffmpeg dipasang.', success: false, error: String(err) };
    }
  },
};
