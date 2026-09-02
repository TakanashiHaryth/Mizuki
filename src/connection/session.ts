/**
 * Baileys auth state management.
 * Uses the multi-file auth state strategy — session data persists to auth_state/ on disk.
 */

import {
  useMultiFileAuthState,
  WASocket,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import { logger } from '../services/logger';
import path from 'path';
import { promises as fs } from 'fs';

const AUTH_DIR = path.join(process.cwd(), 'auth_state');

async function protectAuthStateFiles(): Promise<void> {
  // Windows ignores POSIX permission bits; keeping this directory private to
  // the bot's OS account and out of Git remains essential there.
  if (process.platform === 'win32') return;

  await fs.mkdir(AUTH_DIR, { recursive: true, mode: 0o700 });
  await fs.chmod(AUTH_DIR, 0o700);
  const entries = await fs.readdir(AUTH_DIR, { withFileTypes: true });
  await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map((entry) => fs.chmod(path.join(AUTH_DIR, entry.name), 0o600))
  );
}

/**
 * Loads or creates auth state for the Baileys connection.
 * Returns the state and saveCreds callback required by Baileys.
 */
export async function loadAuthState() {
  await fs.mkdir(AUTH_DIR, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  await protectAuthStateFiles();

  const saveProtectedCreds = async () => {
    await saveCreds();
    await protectAuthStateFiles();
  };

  logger.info({ authDir: AUTH_DIR }, 'Auth state loaded');

  return {
    state: {
      ...state,
      keys: makeCacheableSignalKeyStore(state.keys, logger as any, undefined),
    },
    saveCreds: saveProtectedCreds,
  };
}

/**
 * Fetches the latest Baileys/WA Web version info.
 */
export async function getLatestVersion() {
  const { version, isLatest } = await fetchLatestBaileysVersion();
  logger.info({ version, isLatest }, 'WhatsApp Web version info');
  return { version, isLatest };
}
