/** Command: sticker (image to WebP sticker). */

import { CommandHandler, CommandResult, CommandContext } from '../../types';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { imageToSticker, validateImageSize } from '../../media/imageProcessor';
import { isDeclaredFileSizeAllowed, resolveImageMedia } from '../../media/messageResolver';
import { logger } from '../../services/logger';
import { config } from '../../config';

export const imageToStickerHandler: CommandHandler = {
  name: 'sticker',
  category: 'media',
  adminOnly: false,
  userRateLimit: config.rateLimits.media,

  async execute(ctx: CommandContext): Promise<CommandResult> {
    const resolved = resolveImageMedia(ctx.message);
    if (!resolved) {
      return {
        reply: `⚠️ Hantar atau reply *gambar* dengan *${config.bot.prefix}sticker*.`,
        success: false,
        error: 'No image found',
      };
    }

    const maxBytes = config.media.maxFileSizeMB * 1024 * 1024;
    if (!isDeclaredFileSizeAllowed(resolved.imageMessage.fileLength, maxBytes)) {
      return { reply: `⚠️ Gambar terlalu besar (maksimum ${config.media.maxFileSizeMB}MB).`, success: false };
    }

    try {
      const mediaMsg = { ...ctx.message, message: resolved.content };
      const buffer = await downloadMediaMessage(mediaMsg as any, 'buffer', {}) as Buffer;
      if (!validateImageSize(buffer)) {
        return { reply: `⚠️ Gambar terlalu besar (maksimum ${config.media.maxFileSizeMB}MB).`, success: false };
      }

      return { reply: { type: 'sticker', buffer: await imageToSticker(buffer) }, success: true };
    } catch (err) {
      logger.error({ err }, 'ImageToSticker failed');
      return { reply: '❌ Sticker gagal dibuat. Pastikan gambar sah.', success: false, error: String(err) };
    }
  },
};
