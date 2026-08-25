/**
 * Mizuki WhatsApp Bot — Entry Point
 *
 * Bootstraps the Baileys connection, wires up event listeners for messages and
 * group participant changes, connects to MySQL, and starts the message router.
 */

import makeWASocket, {
  DisconnectReason,
  WASocket,
  BaileysEventMap,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import { loadAuthState, getLatestVersion } from './connection/session';
import { handleDisconnect, resetBackoff } from './connection/reconnect';
import { handleMessage } from './router/router';
import { testConnection } from './data/db';
import { upsertUser } from './data/repositories/userRepo';
import { upsertGroup, upsertGroupMember, removeGroupMember } from './data/repositories/groupRepo';
import { logger, maskJid } from './services/logger';
import { config } from './config';
import { pruneOldLogs } from './data/repositories/logRepo';
import { botInstanceLock } from './services/singleInstance';

/** The active Baileys socket */
let sock: WASocket;

/**
 * Creates and starts the WhatsApp connection.
 */
async function startBot(): Promise<void> {
  logger.info('🚀 Starting Mizuki Bot...');

  // Test DB connection first — fail fast if MySQL is down
  try {
    await testConnection();
  } catch (err) {
    logger.error({ err }, 'Failed to connect to MySQL. Is the server running?');
    process.exit(1);
  }

  try {
    const deletedRows = await pruneOldLogs(config.privacy.logRetentionDays);
    if (deletedRows > 0) {
      logger.info({ deletedRows }, 'Expired audit-log rows removed');
    }
  } catch (err) {
    // Log cleanup should not prevent WhatsApp from connecting.
    logger.warn({ err }, 'Could not prune expired audit logs');
  }

  // Load auth state (or create fresh for first-time QR scan)
  const { state, saveCreds } = await loadAuthState();
  const { version } = await getLatestVersion();

  // Create the Baileys socket
  sock = makeWASocket({
    version,
    auth: state,
    logger: logger as any,
    browser: ['Mizuki Bot', 'Chrome', config.bot.version],
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
  });

  // ─── Connection state events ───

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrcode.generate(qr, { small: true });
      logger.info('📱 Scan the QR code above with WhatsApp to connect!');
    }

    if (connection === 'open') {
      logger.info('✅ Connected to WhatsApp successfully!');
      resetBackoff();
    }

    if (connection === 'close') {
      const shouldReconnect = handleDisconnect(lastDisconnect, startBot);
      if (!shouldReconnect) {
        logger.error('💀 Session is dead. Delete auth_state/ folder and restart to re-scan QR.');
      }
    }
  });

  // ─── Save credentials on update ───

  sock.ev.on('creds.update', saveCreds);

  // ─── Message handling ───

  sock.ev.on('messages.upsert', async (upsert) => {
    // Only process new messages (not history sync)
    if (upsert.type !== 'notify') return;

    for (const msg of upsert.messages) {
      // Process each message through the router
      await handleMessage(sock, msg);
    }
  });

  // ─── Group participant updates (auto-register members) ───

  sock.ev.on('group-participants.update', async (update) => {
    try {
      const groupId = await upsertGroup(update.id);

      for (const participant of update.participants) {
        const userId = await upsertUser(participant);

        switch (update.action) {
          case 'add':
            await upsertGroupMember(groupId, userId, 'member');
            logger.info({ participant: maskJid(participant), group: maskJid(update.id) }, 'Member joined group');
            break;

          case 'remove':
            await removeGroupMember(groupId, userId);
            logger.info({ participant: maskJid(participant), group: maskJid(update.id) }, 'Member left/removed from group');
            break;

          case 'promote':
            await upsertGroupMember(groupId, userId, 'admin');
            logger.info({ participant: maskJid(participant), group: maskJid(update.id) }, 'Member promoted to admin');
            break;

          case 'demote':
            await upsertGroupMember(groupId, userId, 'member');
            logger.info({ participant: maskJid(participant), group: maskJid(update.id) }, 'Admin demoted to member');
            break;
        }
      }
    } catch (err) {
      logger.error(
        {
          err,
          action: update.action,
          group: maskJid(update.id),
          participants: update.participants.map(maskJid),
        },
        'Failed to process group participant update'
      );
    }
  });

  logger.info(`🤖 Mizuki Bot v${config.bot.version} is ready!`);
  logger.info(`📝 Prefix: "${config.bot.prefix}" | Wake-word: "${config.bot.wakeWord}"`);
  logger.info(`🧠 AI Model: ${config.gemini.model} | Memory window: ${config.bot.memoryWindow} exchanges`);
}

// ─── Graceful shutdown ───

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutting down Mizuki Bot...');
  try {
    sock?.end(undefined);
    const { closePool } = await import('./data/db');
    await closePool();
  } catch {}
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('exit', () => {
  try { botInstanceLock.release(); } catch {}
});

// ─── Start! ───

try {
  botInstanceLock.acquire();
} catch (err) {
  logger.error({ err }, 'Mizuki startup blocked to protect the WhatsApp session');
  process.exit(1);
}

startBot().catch((err) => {
  logger.error({ err }, 'Fatal error during startup');
  process.exit(1);
});
