import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const DEFAULT_PERSONA =
  'You are Mizuki, a friendly and helpful WhatsApp community assistant. You are cheerful, concise, and slightly playful. Keep responses short and suitable for group chat.';

/**
 * Loads Mizuki's persona from a dedicated text/Markdown file.
 * BOT_PERSONA is retained as a fallback for deployments without that file.
 */
function loadPersona(): string {
  const personaFile = process.env.PERSONALITY_FILE || 'personality.md';
  const personaPath = path.resolve(process.cwd(), personaFile);

  try {
    const persona = fs.readFileSync(personaPath, 'utf8').trim();
    if (persona) return persona;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') throw err;
  }

  return process.env.BOT_PERSONA || DEFAULT_PERSONA;
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

  /** Bot behavior */
  bot: {
    /** AI system prompt / persona */
    persona: loadPersona(),
    /** Number of past exchanges kept per user (1 exchange = user + assistant msg) */
    memoryWindow: parseInt(process.env.MEMORY_WINDOW || '5', 10),
    /** Command prefix */
    prefix: process.env.BOT_PREFIX || '!m',
    /** Wake-word (case-insensitive, must appear at start of message) */
    wakeWord: 'mizuki',
    /** Version string shown in the infobot command */
    version: '1.0.0',
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
    media: {
      maxUses: parseInt(process.env.MEDIA_RATE_LIMIT_MAX || '3', 10),
      windowSeconds: parseInt(process.env.MEDIA_RATE_LIMIT_WINDOW_SECONDS || '300', 10),
    },
  },

  /** Media processing limits */
  media: {
    maxFileSizeMB: 16,
    maxVideoDurationSeconds: 10,
    stickerSize: 512,
    maxConcurrentJobs: parseInt(process.env.MEDIA_MAX_CONCURRENT || '2', 10),
    maxQueuedJobs: parseInt(process.env.MEDIA_MAX_QUEUE || '8', 10),
  },

  /** Maximum text sent to the AI in one request */
  ai: {
    maxInputCharacters: parseInt(process.env.AI_MAX_INPUT_CHARACTERS || '4000', 10),
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
