/**
 * Video/GIF processor.
 * Handles GIF ↔ video conversions using fluent-ffmpeg.
 * Requires ffmpeg installed at OS level.
 */

import ffmpeg from 'fluent-ffmpeg';
import { Readable, PassThrough } from 'stream';
import { logger } from '../services/logger';
import { config } from '../config';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

/**
 * Creates a temp file path for ffmpeg processing.
 */
function tempFile(ext: string): string {
  const name = crypto.randomBytes(8).toString('hex');
  return path.join(os.tmpdir(), `mizuki_${name}.${ext}`);
}

/**
 * Converts a GIF buffer to MP4 video.
 */
export async function gifToVideo(buffer: Buffer): Promise<Buffer> {
  const inputPath = tempFile('gif');
  const outputPath = tempFile('mp4');

  try {
    fs.writeFileSync(inputPath, buffer);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-movflags', 'faststart',
          '-pix_fmt', 'yuv420p',
          '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        ])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });

    return fs.readFileSync(outputPath);
  } catch (err) {
    logger.error({ err }, 'Failed to convert GIF to video');
    throw new Error('Failed to convert GIF. The file may be corrupted or ffmpeg is not installed.');
  } finally {
    // Clean up temp files
    try { fs.unlinkSync(inputPath); } catch {}
    try { fs.unlinkSync(outputPath); } catch {}
  }
}

/**
 * Converts a video buffer to GIF.
 * Caps duration at MAX_VIDEO_DURATION_SECONDS.
 */
export async function videoToGif(buffer: Buffer): Promise<Buffer> {
  const inputPath = tempFile('mp4');
  const outputPath = tempFile('mp4');
  const maxDuration = config.media.maxVideoDurationSeconds;

  try {
    fs.writeFileSync(inputPath, buffer);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .duration(maxDuration)
        .outputOptions([
          '-movflags', 'faststart',
          '-pix_fmt', 'yuv420p',
          '-an',
          '-vf', 'fps=12,scale=320:-2:flags=lanczos',
        ])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });

    return fs.readFileSync(outputPath);
  } catch (err) {
    logger.error({ err }, 'Failed to convert video to GIF');
    throw new Error('Failed to convert video. The file may be corrupted or ffmpeg is not installed.');
  } finally {
    try { fs.unlinkSync(inputPath); } catch {}
    try { fs.unlinkSync(outputPath); } catch {}
  }
}

/**
 * Validates a video buffer's size against the configured max.
 */
export function validateVideoSize(buffer: Buffer): boolean {
  const maxBytes = config.media.maxFileSizeMB * 1024 * 1024;
  return buffer.length <= maxBytes;
}
