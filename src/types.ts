/**
 * Shared type definitions for the Mizuki bot.
 * All handler interfaces, context types, and result types live here.
 */

import { proto } from '@whiskeysockets/baileys';

/** Categories that a command can belong to */
export type CommandCategory = 'admin' | 'general' | 'utility' | 'minigame' | 'media' | 'ai';

/** The context object passed to every command handler's execute() */
export interface CommandContext {
  /** Raw Baileys message object */
  message: proto.IWebMessageInfo;
  /** Parsed command arguments (everything after the command name) */
  args: string[];
  /** Info about who sent the command */
  sender: {
    waJid: string;
    userId: number;
  };
  /** Info about the group the command was sent in */
  group: {
    waGroupId: string;
    groupId: number;
  };
  /** The full raw text of the message */
  rawText: string;
}

/** A media reply (image, video, sticker, etc.) */
export interface MediaReply {
  type: 'image' | 'video' | 'sticker';
  buffer: Buffer;
  mimetype?: string;
  caption?: string;
  /** Render an MP4 video as an auto-playing WhatsApp GIF */
  gifPlayback?: boolean;
}

/** A text reply with optional WhatsApp mentions */
export interface TextReply {
  type: 'text';
  text: string;
  mentions?: string[];
}

/** A native WhatsApp poll reply */
export interface PollReply {
  type: 'poll';
  name: string;
  options: string[];
  selectableCount: number;
}

/** The result returned by every handler's execute() */
export interface CommandResult {
  /** Text, media, or native poll reply */
  reply: string | TextReply | MediaReply | PollReply;
  /** Whether the command succeeded */
  success: boolean;
  /** Internal error message (never shown to user) */
  error?: string;
}

/** The contract every command handler must implement */
export interface CommandHandler {
  /** Command name (e.g. "kick", "ping", "flipcoin") */
  name: string;
  /** Which category this command belongs to */
  category: CommandCategory;
  /** If true, only group admins can use this command */
  adminOnly: boolean;
  /** Cooldown in seconds (omit or 0 = no cooldown) */
  cooldownSeconds?: number;
  /** Persistent per-user usage limit for expensive commands */
  userRateLimit?: {
    maxUses: number;
    windowSeconds: number;
  };
  /** Execute the command and return a result */
  execute(ctx: CommandContext): Promise<CommandResult>;
}

/** LLM adapter interface — provider-agnostic */
export interface LLMAdapter {
  chat(params: {
    systemPrompt: string;
    history: { role: 'user' | 'assistant'; content: string }[];
    userMessage: string;
  }): Promise<string>;
}
