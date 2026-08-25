import { CommandContext, CommandHandler, CommandReply, CommandResult } from '../../types';
import {
  DownloadPlatform,
  SocialDownloadError,
  downloadSocialMedia,
  parseSocialDownloadRequest,
} from '../../media/socialDownloader';
import { config } from '../../config';
import { logger } from '../../services/logger';

export function createSocialDownloadHandler(
  name: DownloadPlatform,
  label: string
): CommandHandler {
  return {
    name,
    category: 'media',
    adminOnly: false,
    processingReaction: true,

    async execute(ctx: CommandContext): Promise<CommandResult> {
      let request;
      try {
        request = parseSocialDownloadRequest(name, ctx.args);
      } catch (err) {
        const message = err instanceof SocialDownloadError ? err.userMessage : 'Link tidak sah.';
        return {
          reply:
            `⚠️ ${message}\n` +
            `Video: *${config.bot.prefix} ${name} <link>*\n` +
            `Audio: *${config.bot.prefix} ${name} audio <link>*`,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }

      try {
        const media = await downloadSocialMedia(request);
        const replies: CommandReply[] = media.map((item, index) => {
          if (item.type === 'audio') {
            return { type: 'audio', buffer: item.buffer, mimetype: item.mimetype };
          }

          const position = media.length > 1 ? ` • ${index + 1}/${media.length}` : '';
          const caption = `${label}${position} • Dimuat turun oleh Mizuki`;
          return item.type === 'image'
            ? { type: 'image', buffer: item.buffer, mimetype: item.mimetype, caption }
            : { type: 'video', buffer: item.buffer, mimetype: item.mimetype, caption };
        });

        return {
          reply: replies.length === 1 ? replies[0] : replies,
          success: true,
        };
      } catch (err) {
        if (err instanceof SocialDownloadError) {
          logger.warn({ platform: name, code: err.code }, 'Social media download failed');
          return { reply: `❌ ${err.userMessage}`, success: false, error: err.code };
        }

        logger.error({ platform: name }, 'Unexpected social media download failure');
        return { reply: '❌ Media gagal dimuat turun.', success: false, error: 'Unexpected download failure' };
      }
    },
  };
}
