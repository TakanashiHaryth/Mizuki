/** Command: img (WebP sticker to PNG). */

import { CommandHandler, CommandResult, CommandContext } from '../../types';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { stickerToImage, validateImageSize } from '../../media/imageProcessor';
import { isDeclaredFileSizeAllowed, resolveStickerMedia } from '../../media/messageResolver';
import { logger } from '../../services/logger';
import { config } from '../../config';

export const stickerToImageHandler: CommandHandler = {
  name: 'img',
  category: 'media',
  adminOnly: false,
  userRateLimit: config.rateLimits.media,
  processingReaction: true,

  async execute(ctx: CommandContext): Promise<CommandResult> {
    const resolved = resolveStickerMedia(ctx.message);
    if (!resolved) {
      return {
        reply: `⚠️ Hantar atau reply *sticker* dengan *${config.bot.prefix}img*.`,
        success: false,
        error: 'No sticker found',
      };
    }

    const maxBytes = config.media.maxFileSizeMB * 1024 * 1024;
    if (!isDeclaredFileSizeAllowed(resolved.stickerMessage.fileLength, maxBytes)) {
      return { reply: `⚠️ Sticker terlalu besar (maksimum ${config.media.maxFileSizeMB}MB).`, success: false };
    }

    try {
      const mediaMsg = { ...ctx.message, message: resolved.content };
      const buffer = await downloadMediaMessage(mediaMsg as any, 'buffer', {}) as Buffer;
      if (!validateImageSize(buffer)) {
        return { reply: '⚠️ Fail terlalu besar untuk ditukar.', success: false };
      }

      return {
        reply: {
          type: 'image',
          buffer: await stickerToImage(buffer),
          mimetype: 'image/png',
          caption: '🖼️ Sticker ditukar kepada gambar',
        },
        success: true,
      };
    } catch (err) {
      logger.error({ err }, 'StickerToImage failed');
      return { reply: '❌ Sticker gagal ditukar. Ia mungkin animasi atau rosak.', success: false, error: String(err) };
    }
  },
};
