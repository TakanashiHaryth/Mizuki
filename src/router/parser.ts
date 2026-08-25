/**
 * Message parser.
 * Extracts command name and arguments from raw message text.
 * Handles both the configured prefix and Mizuki wake-word triggers.
 */

import { config } from '../config';

export interface ParsedCommand {
  /** Whether the message matched a trigger at all */
  triggered: boolean;
  /** The command name (lowercase), e.g. "kick", "ping", "ai" */
  command: string;
  /** Everything after the command name, split by whitespace */
  args: string[];
  /** Whether this was triggered via the wake-word (freeform AI chat) */
  isWakeWord: boolean;
  /** The full raw text of the message */
  rawText: string;
}

/**
 * Parses a message and determines if/how it was triggered.
 *
 * Trigger rules (from PRD):
 * - Message starts with the configured prefix followed by a space → prefix command
 * - Message starts with "Mizuki" (case-insensitive) → wake-word (AI chat)
 */
export function parseMessage(text: string): ParsedCommand {
  const trimmed = text.trim();
  const result: ParsedCommand = {
    triggered: false,
    command: '',
    args: [],
    isWakeWord: false,
    rawText: trimmed,
  };

  if (!trimmed) return result;

  const { prefix, wakeWord } = config.bot;

  // Require a space between the prefix and command.
  const prefixWithSpace = `${prefix} `;
  if (trimmed.toLowerCase().startsWith(prefixWithSpace.toLowerCase())) {
    const afterPrefix = trimmed.slice(prefixWithSpace.length).trim();
    if (!afterPrefix) return result;

    const parts = afterPrefix.split(/\s+/);
    result.triggered = true;
    result.command = parts[0].toLowerCase();
    result.args = parts.slice(1);
    return result;
  }

  // Check Mizuki wake-word
  if (trimmed.toLowerCase().startsWith(wakeWord.toLowerCase())) {
    const afterWakeWord = trimmed.slice(wakeWord.length).trim();
    // Strip leading comma/colon that people naturally add ("Mizuki, hello")
    const cleaned = afterWakeWord.replace(/^[,:\s]+/, '').trim();

    result.triggered = true;
    result.isWakeWord = true;
    result.command = 'ai'; // wake-word always routes to AI handler
    result.args = cleaned ? [cleaned] : [];
    return result;
  }

  return result;
}
