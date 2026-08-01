/**
 * Structured JSON logger using pino.
 * All modules import this singleton — never use console.log directly.
 */

import pino from 'pino';
import { config } from '../config';

export const logger = pino({
  level: config.log.level,
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino/file', options: { destination: 1 } }
      : undefined,
  formatters: {
    bindings: (bindings) => ({
      pid: bindings.pid,
      host: bindings.hostname,
    }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/** Masks a WhatsApp user/group identifier before it reaches console logs. */
export function maskJid(jid: string | null | undefined): string {
  if (!jid) return 'unknown';
  const [local, domain] = jid.split('@');
  const visible = local.slice(0, Math.min(4, local.length));
  return `${visible}***${domain ? `@${domain}` : ''}`;
}
