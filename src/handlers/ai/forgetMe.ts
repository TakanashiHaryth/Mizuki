/** Deletes all AI memory for a user and disables future memory storage. */

import { CommandHandler, CommandResult, CommandContext } from '../../types';
import { deleteAllMemory } from '../../data/repositories/memoryRepo';
import { setMemoryOptOut } from '../../data/repositories/userRepo';
import { logger } from '../../services/logger';

export const forgetMeHandler: CommandHandler = {
  name: 'forgetme',
  category: 'ai',
  adminOnly: false,

  async execute(ctx: CommandContext): Promise<CommandResult> {
    try {
      await deleteAllMemory(ctx.sender.userId);
      await setMemoryOptOut(ctx.sender.userId, true);

      return {
        reply: '✅ Semua sejarah perbualan AI anda telah dipadam secara kekal dan memori AI telah dimatikan untuk anda. Mizuki masih boleh menjawab tanpa mengingati chat lama.',
        success: true,
      };
    } catch (err) {
      logger.error({ err }, 'ForgetMe failed');
      return {
        reply: '❌ Data anda tidak dapat dipadam sekarang. Sila cuba lagi.',
        success: false,
        error: String(err),
      };
    }
  },
};
