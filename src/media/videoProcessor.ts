import ffmpeg from 'fluent-ffmpeg';
import { logger } from '../services/logger';
import { config } from '../config';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { addStickerMetadata } from './stickerMetadata';

function tempFile(ext: string): string {
  const name = crypto.randomBytes(8).toString('hex');
  return path.join(os.tmpdir(), `mizuki_${name}.${ext}`);
}

function runFfmpeg(command: ffmpeg.FfmpegCommand): Promise<void> {
  return new Promise((resolve, reject) => {
    command
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

/** Converts a GIF buffer to a normal MP4 video. */
export async function gifToVideo(buffer: Buffer): Promise<Buffer> {
  const inputPath = tempFile('gif');
  const outputPath = tempFile('mp4');

  try {
    fs.writeFileSync(inputPath, buffer);
    await runFfmpeg(
      ffmpeg(inputPath)
        .outputOptions([
          '-movflags', 'faststart',
          '-pix_fmt', 'yuv420p',
          '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        ])
        .output(outputPath)
    );
    return fs.readFileSync(outputPath);
  } catch (err) {
    logger.error({ err }, 'Failed to convert GIF to video');
    throw new Error('GIF gagal ditukar. Fail mungkin rosak atau ffmpeg tidak tersedia.');
  } finally {
    try { fs.unlinkSync(inputPath); } catch {}
    try { fs.unlinkSync(outputPath); } catch {}
  }
}

interface StickerProfile {
  canvas: number;
  quality: number;
}

const ANIMATED_STICKER_PROFILES: StickerProfile[] = [
  { canvas: 512, quality: 65 },
  { canvas: 448, quality: 58 },
  { canvas: 384, quality: 50 },
  { canvas: 320, quality: 42 },
  { canvas: 288, quality: 36 },
  { canvas: 256, quality: 30 },
  { canvas: 224, quality: 26 },
];

function profilesForDuration(durationSeconds?: number): StickerProfile[] {
  if (!durationSeconds || durationSeconds <= 4) return ANIMATED_STICKER_PROFILES;
  const usesMaximumFps = config.media.animatedStickerFps >= 30;
  if (durationSeconds <= 7) {
    return ANIMATED_STICKER_PROFILES.slice(usesMaximumFps ? 3 : 2);
  }
  return ANIMATED_STICKER_PROFILES.slice(usesMaximumFps ? 5 : 3);
}

/** Converts a short video into a looping animated WebP WhatsApp sticker. */
export async function videoToAnimatedSticker(
  buffer: Buffer,
  durationSeconds?: number
): Promise<Buffer> {
  const inputPath = tempFile('mp4');
  const outputPath = tempFile('webp');
  const maxBytes = config.media.maxAnimatedStickerSizeKB * 1024;

  try {
    fs.writeFileSync(inputPath, buffer);

    // Longer videos start with a lighter profile instead of wasting time on an
    // output that is very likely to exceed WhatsApp's sticker size limit.
    for (const profile of profilesForDuration(durationSeconds)) {
      try { fs.unlinkSync(outputPath); } catch {}

      const filter = [
        `fps=${config.media.animatedStickerFps}`,
        `scale=${profile.canvas}:${profile.canvas}:force_original_aspect_ratio=decrease:flags=bicubic`,
        `pad=${profile.canvas}:${profile.canvas}:(ow-iw)/2:(oh-ih)/2:color=0x00000000`,
        'format=rgba',
      ].join(',');

      await runFfmpeg(
        ffmpeg(inputPath)
          .duration(config.media.maxVideoDurationSeconds)
          .outputOptions([
            '-an',
            '-c:v', 'libwebp_anim',
            '-lossless', '0',
            '-compression_level', String(config.media.animatedStickerCompressionLevel),
            '-q:v', String(profile.quality),
            '-threads', String(config.media.ffmpegThreads),
            '-loop', '0',
            '-vf', filter,
          ])
          .format('webp')
          .output(outputPath)
      );

      const result = await addStickerMetadata(fs.readFileSync(outputPath));
      if (result.length <= maxBytes) return result;
    }

    throw new Error(
      `Animated sticker melebihi ${config.media.maxAnimatedStickerSizeKB}KB walaupun selepas dimampatkan.`
    );
  } catch (err) {
    logger.error({ err }, 'Failed to convert video to animated sticker');
    if (err instanceof Error && err.message.startsWith('Animated sticker melebihi')) {
      throw err;
    }
    throw new Error('Video gagal ditukar kepada animated sticker. Pastikan video sah dan ffmpeg tersedia.');
  } finally {
    try { fs.unlinkSync(inputPath); } catch {}
    try { fs.unlinkSync(outputPath); } catch {}
  }
}

export function validateVideoSize(buffer: Buffer): boolean {
  const maxBytes = config.media.maxFileSizeMB * 1024 * 1024;
  return buffer.length <= maxBytes;
}
