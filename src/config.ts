import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

function booleanFromEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(value)) return true;
  if (['0', 'false', 'no', 'off'].includes(value)) return false;
  return fallback;
}

function integerFromEnv(name: string, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(process.env[name] || '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function loadPackageVersion(): string {
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8')
    ) as { version?: string };
    return packageJson.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * Centralized configuration for the Mizuki bot.
 * All tuneable values live here — no magic numbers scattered across handlers.
 */
export const config = {
  /** Google Gemini */
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
  },

  /** MySQL connection */
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'mizuki',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mizuki_bot',
  },

  /** Local MySQL backup/restore tooling */
  dbBackup: {
    directory: process.env.DB_BACKUP_DIR || 'backups',
    retentionDays: parseInt(process.env.DB_BACKUP_RETENTION_DAYS || '30', 10),
    mysqlBinDir: process.env.MYSQL_BIN_DIR || '',
  },

  /** Bot behavior */
  bot: {
    /** Number of past exchanges kept per user (1 exchange = user + assistant msg) */
    memoryWindow: parseInt(process.env.MEMORY_WINDOW || '5', 10),
    /** Command prefix */
    prefix: process.env.BOT_PREFIX || '!m',
    /** Wake-word (case-insensitive, must appear at start of message) */
    wakeWord: 'mizuki',
    /** Version string shown in the infobot command */
    version: loadPackageVersion(),
  },

  /** Bot owner details shown by the owner command */
  owner: {
    name: process.env.OWNER_NAME || 'Mizuki Owner',
    number: process.env.OWNER_NUMBER || '',
  },

  /** Rate limits / cooldowns (in seconds) */
  cooldowns: {
    tagAll: 600, // 10 minutes
  },

  /** Per-user abuse limits persisted in MySQL */
  rateLimits: {
    ai: {
      maxUses: parseInt(process.env.AI_RATE_LIMIT_MAX || '5', 10),
      windowSeconds: parseInt(process.env.AI_RATE_LIMIT_WINDOW_SECONDS || '180', 10),
    },
  },

  /** Media processing limits */
  media: {
    maxFileSizeMB: 16,
    maxVideoDurationSeconds: 10,
    stickerSize: 512,
    maxAnimatedStickerSizeKB: parseInt(process.env.ANIMATED_STICKER_MAX_SIZE_KB || '500', 10),
    /** Smooth output; higher values trade size and encoding time for motion. */
    animatedStickerFps: integerFromEnv('ANIMATED_STICKER_FPS', 30, 8, 30),
    /** WebP 0-6: lower is faster, higher is slower but usually smaller. */
    animatedStickerCompressionLevel: integerFromEnv(
      'ANIMATED_STICKER_COMPRESSION_LEVEL',
      4,
      0,
      6
    ),
    /** 0 lets FFmpeg choose all available threads; positive values cap threads. */
    ffmpegThreads: integerFromEnv('FFMPEG_THREADS', 0, 0, 64),
    /** Disable to bypass the queue and allow media commands to run immediately. */
    queueEnabled: booleanFromEnv('MEDIA_QUEUE_ENABLED', true),
    /** Process one CPU-heavy conversion at a time; other requests wait. */
    maxConcurrentJobs: parseInt(process.env.MEDIA_MAX_CONCURRENT || '1', 10),
    maxQueuedJobs: parseInt(process.env.MEDIA_MAX_QUEUE || '8', 10),
  },

  /** Metadata shown in WhatsApp sticker information */
  stickerMetadata: {
    packId: process.env.STICKER_PACK_ID || 'com.mizuki.bot',
    packName: process.env.STICKER_PACK_NAME || 'Mizuki',
    author: process.env.STICKER_AUTHOR || 'Mizuki Bot',
  },

  /** Maximum text sent to the AI in one request */
  ai: {
    maxInputCharacters: parseInt(process.env.AI_MAX_INPUT_CHARACTERS || '4000', 10),
    /** Short WhatsApp replies generate faster and use fewer tokens. */
    maxOutputTokens: parseInt(process.env.AI_MAX_OUTPUT_TOKENS || '256', 10),
    /** Avoid leaving a group command waiting indefinitely on the provider. */
    timeoutMs: parseInt(process.env.AI_TIMEOUT_MS || '60000', 10),
  },

  /** Public social-media downloads powered by local command-line tools. */
  download: {
    ytDlpPath: process.env.YT_DLP_PATH || 'yt-dlp',
    galleryDlPath: process.env.GALLERY_DL_PATH || 'gallery-dl',
    galleryDlCookiesBrowser: process.env.GALLERY_DL_COOKIES_BROWSER || '',
    socialKitApiKey: process.env.SOCIALKIT_API_KEY?.trim() || '',
    tikWmEnabled: booleanFromEnv('TIKWM_FALLBACK_ENABLED', true),
    delayMinSeconds: integerFromEnv('DOWNLOAD_DELAY_MIN_SECONDS', 5, 0, 60),
    delayMaxSeconds: integerFromEnv('DOWNLOAD_DELAY_MAX_SECONDS', 10, 0, 60),
    maxSizeMB: integerFromEnv('DOWNLOAD_MAX_SIZE_MB', 64, 1, 512),
    maxTotalSizeMB: integerFromEnv('DOWNLOAD_MAX_TOTAL_SIZE_MB', 128, 1, 1024),
    maxItems: integerFromEnv('DOWNLOAD_MAX_ITEMS', 10, 1, 20),
    maxDurationSeconds: integerFromEnv('DOWNLOAD_MAX_DURATION_SECONDS', 900, 1, 7200),
    timeoutMs: integerFromEnv('DOWNLOAD_TIMEOUT_MS', 180000, 10000, 900000),
  },

  /** Local audit-log retention */
  privacy: {
    logRetentionDays: parseInt(process.env.LOG_RETENTION_DAYS || '90', 10),
  },

  /** Logging */
  log: {
    level: process.env.LOG_LEVEL || 'info',
  },
} as const;
