/**
 * Command: poll
 * Category: utility
 * Creates a native single-choice WhatsApp poll.
 *
 * Usage: <prefix> poll Question | Option 1 | Option 2
 */

import { CommandHandler, CommandResult, CommandContext } from '../../types';
import { config } from '../../config';

const MAX_OPTIONS = 12;
const MAX_QUESTION_LENGTH = 255;
const MAX_OPTION_LENGTH = 100;

export const pollHandler: CommandHandler = {
  name: 'poll',
  category: 'utility',
  adminOnly: false,

  async execute(ctx: CommandContext): Promise<CommandResult> {
    const input = ctx.args.join(' ').trim();
    const prefix = config.bot.prefix;
    const usage =
      '📊 *Cara membuat poll*\n\n' +
      `\`${prefix} poll Soalan | Pilihan 1 | Pilihan 2\`\n\n` +
      'Contoh:\n' +
      `\`${prefix} poll Nak makan mana? | Kedai mamak | Nasi kandar | Tomyam\``;

    if (!input) {
      return { reply: usage, success: false, error: 'Missing poll content' };
    }

    const parts = input.split('|').map((part) => part.trim());

    if (parts.some((part) => !part) || parts.length < 3) {
      return {
        reply: `⚠️ Poll memerlukan satu soalan dan sekurang-kurangnya dua pilihan.\n\n${usage}`,
        success: false,
        error: 'Invalid poll format',
      };
    }

    const [question, ...options] = parts;

    if (question.length > MAX_QUESTION_LENGTH) {
      return {
        reply: `⚠️ Soalan terlalu panjang (maksimum ${MAX_QUESTION_LENGTH} aksara).`,
        success: false,
        error: 'Poll question too long',
      };
    }

    if (options.length > MAX_OPTIONS) {
      return {
        reply: `⚠️ Poll hanya boleh mempunyai maksimum ${MAX_OPTIONS} pilihan.`,
        success: false,
        error: 'Too many poll options',
      };
    }

    if (options.some((option) => option.length > MAX_OPTION_LENGTH)) {
      return {
        reply: `⚠️ Setiap pilihan mestilah tidak melebihi ${MAX_OPTION_LENGTH} aksara.`,
        success: false,
        error: 'Poll option too long',
      };
    }

    const normalizedOptions = options.map((option) => option.toLocaleLowerCase());
    if (new Set(normalizedOptions).size !== normalizedOptions.length) {
      return {
        reply: '⚠️ Setiap pilihan mestilah berbeza.',
        success: false,
        error: 'Duplicate poll options',
      };
    }

    return {
      reply: {
        type: 'poll',
        name: question,
        options,
        selectableCount: 1,
      },
      success: true,
    };
  },
};
