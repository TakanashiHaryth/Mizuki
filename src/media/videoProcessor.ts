import ffmpeg from 'fluent-ffmpeg';
import { logger } from '../services/logger';
import { config } from '../config';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { addStickerMetadata } from './stickerMetadata';

const STATUS_PROTOCOL_WHITELIST = 'file';
const STATUS_FORMAT_WHITELIST = 'mov,matroska,webm,avi';

function tempFile(ext: string): string {
  const name = crypto.randomBytes(8).toString('hex');
  return path.join(os.tmpdir(), `mizuki_${name}.${ext}`);
}

function runFfmpeg(command: ffmpeg.FfmpegCommand, timeoutMs = 0): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timedOut = false;
    let timer: NodeJS.Timeout | undefined;
    let killFallback: NodeJS.Timeout | undefined;
    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (killFallback) clearTimeout(killFallback);
      if (timedOut) reject(new Error('Video mengambil masa terlalu lama untuk diproses.'));
      else if (err) reject(err);
      else resolve();
    };

    command
      .on('end', () => finish())
      .on('error', (err) => finish(err))
      .run();

    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        if (settled) return;
        timedOut = true;
        try {
          command.kill('SIGKILL');
          killFallback = setTimeout(() => finish(), 5000);
        } catch {
          finish();
        }
      }, timeoutMs);
    }
  });
}

function probeVideo(inputPath: string): Promise<ffmpeg.FfprobeData> {
  return new Promise((resolve, reject) => {
    execFile(
      'ffprobe',
      [
        '-v', 'error',
        '-protocol_whitelist', STATUS_PROTOCOL_WHITELIST,
        '-format_whitelist', STATUS_FORMAT_WHITELIST,
        '-show_format', '-show_streams', '-show_chapters',
        '-of', 'json',
        inputPath,
      ],
      {
        encoding: 'utf8',
        timeout: config.media.statusProcessingTimeoutMs,
        maxBuffer: 1024 * 1024,
        windowsHide: true,
      },
      (err, stdout) => {
        if (err) {
          const timedOut = (err as NodeJS.ErrnoException & { killed?: boolean }).killed;
          reject(timedOut ? new Error('Video mengambil masa terlalu lama untuk diperiksa.') : err);
          return;
        }
        try {
          resolve(JSON.parse(stdout) as ffmpeg.FfprobeData);
        } catch (parseError) {
          reject(parseError);
        }
      }
    );
  });
}

function primaryVideoStream(metadata: ffmpeg.FfprobeData): ffmpeg.FfprobeStream | undefined {
  return metadata.streams.find(
    (stream) => stream.codec_type === 'video' && stream.disposition?.attached_pic !== 1
  );
}

function frameRate(value?: string): number {
  if (!value) return 0;
  const [rawNumerator, rawDenominator = '1'] = value.split('/');
  const numerator = Number(rawNumerator);
  const denominator = Number(rawDenominator);
  return Number.isFinite(numerator) && denominator > 0 ? numerator / denominator : 0;
}

/** Rejects media that could consume disproportionate decoder resources. */
export function validateStatusVideoMetadata(metadata: ffmpeg.FfprobeData): void {
  const video = primaryVideoStream(metadata);
  const durations = [Number(metadata.format.duration), Number(video?.duration)]
    .filter((value) => Number.isFinite(value) && value > 0);
  const duration = durations.length > 0 ? Math.max(...durations) : 0;
  if (!video?.width || !video.height || duration <= 0) {
    throw new Error('Fail tidak mengandungi video yang sah.');
  }
  if (metadata.streams.length > 16) {
    throw new Error('Video mempunyai terlalu banyak media stream.');
  }
  if (video.width > 7680 || video.height > 7680 || video.width * video.height > 33_177_600) {
    throw new Error('Resolusi sumber video terlalu tinggi untuk diproses dengan selamat.');
  }
  if (Math.max(frameRate(video.avg_frame_rate), frameRate(video.r_frame_rate)) > 120) {
    throw new Error('Kadar frame sumber video terlalu tinggi (maksimum 120 FPS).');
  }
  if (duration > config.media.statusMaxDurationSeconds) {
    throw new Error(`Video terlalu panjang (maksimum ${config.media.statusMaxDurationSeconds} saat).`);
  }
}

/** True when FFmpeg can remux the source to MP4 without reducing quality. */
export function canRemuxStatusVideo(metadata: ffmpeg.FfprobeData): boolean {
  const video = primaryVideoStream(metadata);
  const audio = metadata.streams.find((stream) => stream.codec_type === 'audio');
  const formatNames = metadata.format.format_name?.split(',') || [];
  if (!video?.width || !video.height) return false;

  return formatNames.includes('mp4') &&
    video.codec_name === 'h264' &&
    video.pix_fmt === 'yuv420p' &&
    video.width <= 1920 &&
    video.height <= 1920 &&
    video.width % 2 === 0 &&
    video.height % 2 === 0 &&
    (!audio || audio.codec_name === 'aac');
}

export interface PreparedStatusVideo {
  buffer: Buffer;
  preservedOriginalQuality: boolean;
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

/** Prepares a normal MP4 video that can be forwarded to WhatsApp Status. */
export async function prepareStatusVideo(buffer: Buffer): Promise<PreparedStatusVideo> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mizuki-status-'));
  const inputPath = path.join(tempDir, 'input.bin');
  const outputPath = path.join(tempDir, 'output.mp4');
  const maxBytes = config.media.statusMaxFileSizeMB * 1024 * 1024;

  try {
    fs.writeFileSync(inputPath, buffer, { mode: 0o600 });
    const metadata = await probeVideo(inputPath);
    validateStatusVideoMetadata(metadata);
    const video = primaryVideoStream(metadata)!;

    const preservedOriginalQuality = canRemuxStatusVideo(metadata);
    const command = ffmpeg(inputPath)
      .inputOptions([
        '-protocol_whitelist', STATUS_PROTOCOL_WHITELIST,
        '-format_whitelist', STATUS_FORMAT_WHITELIST,
      ])
      .outputOptions([
        '-map_metadata', '-1',
        '-map_chapters', '-1',
        '-fs', String(maxBytes),
        '-t', String(config.media.statusMaxDurationSeconds),
      ]);

    if (preservedOriginalQuality) {
      command.outputOptions([
        '-map', `0:${video.index}`,
        '-map', '0:a:0?',
        '-c', 'copy',
        '-movflags', '+faststart',
      ]);
    } else {
      command.outputOptions([
        '-map', `0:${video.index}`,
        '-map', '0:a:0?',
        '-sn',
        '-dn',
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '18',
        '-profile:v', 'high',
        '-pix_fmt', 'yuv420p',
        '-vf', `scale=w='min(1920,iw)':h='min(1920,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2`,
        '-c:a', 'aac',
        '-b:a', '192k',
        '-ar', '48000',
        '-threads', String(config.media.ffmpegThreads),
        '-movflags', '+faststart',
      ]);
    }

    await runFfmpeg(
      command.format('mp4').output(outputPath),
      config.media.statusProcessingTimeoutMs
    );
    const outputSize = fs.statSync(outputPath).size;
    if (outputSize >= maxBytes) {
      throw new Error(
        `Video HD melebihi ${config.media.statusMaxFileSizeMB}MB selepas diproses.`
      );
    }
    const result = fs.readFileSync(outputPath);

    return { buffer: result, preservedOriginalQuality };
  } catch (err) {
    logger.error({ err }, 'Failed to prepare WhatsApp Status video');
    if (err instanceof Error && /^(Fail|Video|Resolusi|Kadar)/.test(err.message)) throw err;
    throw new Error('Video gagal diproses. Pastikan fail sah dan ffmpeg tersedia.');
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
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
