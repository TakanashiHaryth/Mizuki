/**
 * Command: dice
 * Category: minigame
 * Returns a random number 1–6, stateless.
 */

import { CommandHandler, CommandResult, CommandContext } from '../../types';
import crypto from 'crypto';

const DICE_EMOJI = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export const diceThrowHandler: CommandHandler = {
  name: 'dice',
  category: 'minigame',
  adminOnly: false,

  async execute(ctx: CommandContext): Promise<CommandResult> {
    const roll = crypto.randomInt(1, 7); // 1–6
    const emoji = DICE_EMOJI[roll - 1];

    return {
      reply: `🎲 ${emoji} You rolled a *${roll}!*`,
      success: true,
    };
  },
};
