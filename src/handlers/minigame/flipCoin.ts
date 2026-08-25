/**
 * Command: flipcoin
 * Category: minigame
 * Returns Heads or Tails, stateless.
 */

import { CommandHandler, CommandResult, CommandContext } from '../../types';
import crypto from 'crypto';

export const flipCoinHandler: CommandHandler = {
  name: 'flipcoin',
  category: 'minigame',
  adminOnly: false,

  async execute(ctx: CommandContext): Promise<CommandResult> {
    const result = crypto.randomInt(2) === 0 ? 'Heads' : 'Tails';
    const emoji = result === 'Heads' ? '🐴' : '🐎';

    return {
      reply: `${emoji} *${result}!*`,
      success: true,
    };
  },
};
