/** Command: personality (view or update Mizuki traits for this group). */

import { CommandContext, CommandHandler, CommandResult } from '../../types';
import { getGroupPersonality, setGroupPersonality } from '../../data/repositories/groupRepo';
import { config } from '../../config';
import {
  DEFAULT_PERSONALITY,
  MAX_PERSONALITY_LENGTH,
  MIN_PERSONALITY_LENGTH,
  normalizePersonality,
} from '../../services/personality';
import { logger } from '../../services/logger';

export const personalityHandler: CommandHandler = {
  name: 'personality',
  category: 'admin',
  adminOnly: true,
  requiresBotAdmin: false,

  async execute(ctx: CommandContext): Promise<CommandResult> {
    const rawInput = ctx.args.join(' ').trim();
    const action = rawInput.toLowerCase();

    try {
      if (!rawInput || action === 'show') {
        const customPersonality = await getGroupPersonality(ctx.group.groupId);
        const personality = customPersonality || DEFAULT_PERSONALITY;
        const source = customPersonality ? 'Custom group' : 'Default';

        return {
          reply:
            `🎭 *Personaliti Mizuki*\n` +
            `Status: ${source}\n` +
            `Sifat: ${personality}\n\n` +
            `Ubah: *${config.bot.prefix} personality [sifat Mizuki]*\n` +
            `Reset: *${config.bot.prefix} personality reset*`,
          success: true,
        };
      }

      if (action === 'reset' || action === 'default') {
        await setGroupPersonality(ctx.group.groupId, null);
        return {
          reply: `✅ Personaliti Mizuki dikembalikan kepada default: *${DEFAULT_PERSONALITY}*`,
          success: true,
        };
      }

      const personality = normalizePersonality(rawInput);
      if (personality.length < MIN_PERSONALITY_LENGTH) {
        return {
          reply: `⚠️ Sifat terlalu pendek. Masukkan sekurang-kurangnya ${MIN_PERSONALITY_LENGTH} aksara.`,
          success: false,
          error: 'Personality is too short',
        };
      }

      if (personality.length > MAX_PERSONALITY_LENGTH) {
        return {
          reply: `⚠️ Sifat terlalu panjang. Maksimum ${MAX_PERSONALITY_LENGTH} aksara.`,
          success: false,
          error: 'Personality is too long',
        };
      }

      await setGroupPersonality(ctx.group.groupId, personality);
      return {
        reply: `✅ Personaliti Mizuki untuk group ini sudah diubah.\nSifat: *${personality}*`,
        success: true,
      };
    } catch (err) {
      logger.error({ err, groupId: ctx.group.groupId }, 'Failed to update group personality');
      return {
        reply: '❌ Personaliti Mizuki gagal dikemas kini. Pastikan migrasi database sudah dijalankan.',
        success: false,
        error: String(err),
      };
    }
  },
};
