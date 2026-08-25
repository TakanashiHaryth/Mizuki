/** Explains what local data Mizuki stores and how users can opt out. */

import { CommandHandler, CommandResult } from '../../types';
import { config } from '../../config';

export const privacyHandler: CommandHandler = {
  name: 'privacy',
  category: 'general',
  adminOnly: false,

  async execute(): Promise<CommandResult> {
    return {
      reply:
        `🔐 *Privasi Mizuki*\n\n` +
        `• AI menyimpan maksimum ${config.bot.memoryWindow} pertukaran terakhir anda, berasingan bagi setiap kumpulan.\n` +
        `• ID WhatsApp, nama paparan, keahlian kumpulan dan penggunaan arahan disimpan dalam pangkalan data bot.\n` +
        `• Log arahan/admin dipadam selepas ${config.privacy.logRetentionDays} hari.\n` +
        `• Taip *${config.bot.prefix} forgetme* untuk memadam semua memori AI anda dan menghentikan penyimpanan memori baharu.\n\n` +
        `_Data disimpan oleh pemilik bot ini, bukan dalam repositori GitHub._`,
      success: true,
    };
  },
};
