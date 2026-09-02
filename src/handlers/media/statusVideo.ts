/** Command: status (prepare a high-quality MP4 for forwarding to WhatsApp Status). */

import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { CommandContext, CommandHandler, CommandResult } from '../../types';
import { config } from '../../config';
import {
  isDeclaredFileSizeAllowed,
  ResolvedVideoMedia,
  resolveVideoMedia,
} from '../../media/messageResolver';
import { prepareStatusVideo } from '../../media/videoProcessor';
import { logger } from '../../services/logger';

interface DestroyableMediaStream extends AsyncIterable<Uint8Array> {
  destroy?: (error?: Error) => void;
}

export async function collectMediaStreamWithLimit(
  stream: DestroyableMediaStream,
  maxBytes: number,
  timeoutMs = 0
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  let timer: NodeJS.Timeout | undefined;
  const deadline = timeoutMs > 0
    ? new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          stream.destroy?.();
          reject(new Error('Media download timed out'));
        }, timeoutMs);
      })
    : undefined;
  const iterator = stream[Symbol.asyncIterator]();

  try {
    while (true) {
      const next = iterator.next();
      const { done, value } = deadline ? await Promise.race([next, deadline]) : await next;
      if (done) break;
      const part = Buffer.from(value);
      totalBytes += part.length;
      if (totalBytes > maxBytes) {
        stream.destroy?.();
        throw new Error('Media exceeds configured size limit');
      }
      chunks.push(part);
    }
    return Buffer.concat(chunks, totalBytes);
  } catch (err) {
    stream.destroy?.();
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function downloadVideoWithLimit(
  resolved: ResolvedVideoMedia,
  maxBytes: number
): Promise<Buffer> {
  const message = resolved.videoMessage ?? resolved.documentMessage;
  const mediaType = resolved.videoMessage ? 'video' : 'document';
  if (!message) throw new Error('Fail tidak mengandungi video yang sah.');

  const timeoutMs = config.media.statusProcessingTimeoutMs;
  const controller = new AbortController();
  let stream: DestroyableMediaStream | undefined;
  const timer = setTimeout(() => {
    controller.abort();
    stream?.destroy?.();
  }, timeoutMs);

  try {
    stream = await downloadContentFromMessage(message as any, mediaType, {
      options: { timeout: timeoutMs, signal: controller.signal },
    });
    if (!stream) throw new Error('Video gagal dimuat turun.');
    return await collectMediaStreamWithLimit(stream, maxBytes, timeoutMs);
  } catch (err) {
    if (controller.signal.aborted ||
        (err instanceof Error && err.message === 'Media download timed out')) {
      throw new Error('Video mengambil masa terlalu lama untuk dimuat turun.');
    }
    if (err instanceof Error && err.message === 'Media exceeds configured size limit') {
      throw new Error(`Video terlalu besar (maksimum ${config.media.statusMaxFileSizeMB}MB).`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
    stream?.destroy?.();
  }
}

export const statusVideoHandler: CommandHandler = {
  name: 'status',
  category: 'media',
  adminOnly: false,
  processingReaction: true,

  async execute(ctx: CommandContext): Promise<CommandResult> {
    const resolved = resolveVideoMedia(ctx.message, 'video');
    if (!resolved) {
      return {
        reply: `⚠️ Hantar atau reply *video/document video* dengan *${config.bot.prefix} status*.`,
        success: false,
        error: 'No video found',
      };
    }

    const maxBytes = config.media.statusMaxFileSizeMB * 1024 * 1024;
    const declaredSize = resolved.videoMessage?.fileLength ?? resolved.documentMessage?.fileLength;
    if (!isDeclaredFileSizeAllowed(declaredSize, maxBytes)) {
      return {
        reply: `⚠️ Video terlalu besar (maksimum ${config.media.statusMaxFileSizeMB}MB).`,
        success: false,
      };
    }

    if (
      resolved.videoMessage?.seconds &&
      resolved.videoMessage.seconds > config.media.statusMaxDurationSeconds
    ) {
      return {
        reply: `⚠️ Video terlalu panjang (maksimum ${config.media.statusMaxDurationSeconds} saat).`,
        success: false,
      };
    }

    try {
      const buffer = await downloadVideoWithLimit(resolved, maxBytes);
      if (buffer.length > maxBytes) {
        return {
          reply: `⚠️ Video terlalu besar (maksimum ${config.media.statusMaxFileSizeMB}MB).`,
          success: false,
        };
      }

      const prepared = await prepareStatusVideo(buffer);
      const qualityNote = prepared.preservedOriginalQuality
        ? '✅ Sumber dikekalkan tanpa encode semula oleh Mizuki.'
        : '✅ Ditukar sekali kepada MP4 H.264/AAC berkualiti tinggi.';

      return {
        reply: {
          type: 'video',
          buffer: prepared.buffer,
          mimetype: 'video/mp4',
          caption: `🎬 Video sedia untuk *Forward → My status*.\n${qualityNote}\nℹ️ WhatsApp mungkin memampatkan semula video ketika dimuat naik ke Status.`,
        },
        success: true,
      };
    } catch (err) {
      logger.error({ err }, 'Status video preparation failed');
      const publicMessage = err instanceof Error &&
        /^(Fail|Video terlalu|Video HD|Video mengambil|Resolusi|Kadar)/.test(err.message)
        ? err.message
        : 'Video gagal diproses. Pastikan fail sah dan cuba lagi.';
      return {
        reply: `❌ ${publicMessage}`,
        success: false,
        error: String(err),
      };
    }
  },
};
