/** Command: owner — shows the configured bot owner's WhatsApp contact. */

import { CommandHandler, CommandContext, CommandResult } from '../../types';
import { config } from '../../config';

export const ownerHandler: CommandHandler = {
  name: 'owner',
  category: 'general',
  adminOnly: false,

  async execute(_ctx: CommandContext): Promise<CommandResult> {
    const number = config.owner.number.replace(/\D/g, '');

    if (!number) {
      return {
        reply: '⚠️ Maklumat owner belum ditetapkan. Tambahkan OWNER_NAME dan OWNER_NUMBER dalam fail .env.',
        success: false,
        error: 'OWNER_NUMBER is not configured',
      };
    }

    const ownerJid = `${number}@s.whatsapp.net`;
    return {
      reply: {
        type: 'text',
        text: [
          '👤 *Pemilik Mizuki*',
          '',
          `📌 Nama: ${config.owner.name}`,
          `📱 WhatsApp: @${number}`,
          `🔗 Hubungi: https://wa.me/${number}`,
        ].join('\n'),
        mentions: [ownerJid],
      },
      success: true,
    };
  },
};
