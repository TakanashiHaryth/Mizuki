/**
 * Image processor.
 * Handles sticker ↔ image conversions using sharp.
 */

import sharp from 'sharp';
import { logger } from '../services/logger';
import { config } from '../config';
import { addStickerMetadata } from './stickerMetadata';

/**
 * Converts a WebP sticker buffer to PNG.
 */
export async function stickerToImage(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer).png().toBuffer();
  } catch (err) {
    logger.error({ err }, 'Failed to convert sticker to image');
    throw new Error('Failed to convert sticker. The file may be corrupted.');
  }
}

/**
 * Converts an image buffer to a 512x512 WebP sticker.
 */
export async function imageToSticker(buffer: Buffer): Promise<Buffer> {
  try {
    const size = config.media.stickerSize;
    const webp = await sharp(buffer)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 80 })
      .toBuffer();
    return await addStickerMetadata(webp);
  } catch (err) {
    logger.error({ err }, 'Failed to convert image to sticker');
    throw new Error('Failed to create sticker. Make sure the image is valid.');
  }
}

/**
 * Validates an image buffer's size against the configured max.
 * @returns true if within limits
 */
export function validateImageSize(buffer: Buffer): boolean {
  const maxBytes = config.media.maxFileSizeMB * 1024 * 1024;
  return buffer.length <= maxBytes;
}
