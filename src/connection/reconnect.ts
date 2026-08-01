/**
 * Reconnection logic with exponential backoff.
 * Start at 2s, double each attempt, cap at 60s.
 */

import { logger } from '../services/logger';
import { DisconnectReason } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';

const INITIAL_DELAY_MS = 2000;
const MAX_DELAY_MS = 60000;
const BACKOFF_MULTIPLIER = 2;

let currentDelay = INITIAL_DELAY_MS;
let reconnectTimer: NodeJS.Timeout | null = null;

/**
 * Determines whether the bot should reconnect based on the disconnect reason,
 * and schedules a reconnection if appropriate.
 *
 * @returns true if reconnection is scheduled, false if the session is dead (manual re-scan needed).
 */
export function handleDisconnect(
  lastDisconnect: { error?: Error; date?: Date } | undefined,
  reconnectFn: () => void
): boolean {
  const error = lastDisconnect?.error as Boom | undefined;
  const statusCode = error?.output?.statusCode;

  // Deliberate logout — session is dead, no auto-reconnect
  if (statusCode === DisconnectReason.loggedOut) {
    logger.error(
      'Session logged out! You need to delete auth_state/ and re-scan the QR code.'
    );
    resetBackoff();
    return false;
  }

  // Any other disconnect — schedule a reconnect
  logger.warn(
    { statusCode, delay: currentDelay },
    'Disconnected from WhatsApp, scheduling reconnect...'
  );

  if (reconnectTimer) clearTimeout(reconnectTimer);

  reconnectTimer = setTimeout(() => {
    reconnectFn();
    // Increase delay for next attempt
    currentDelay = Math.min(currentDelay * BACKOFF_MULTIPLIER, MAX_DELAY_MS);
  }, currentDelay);

  return true;
}

/**
 * Resets the backoff delay to initial value. Call on successful connection.
 */
export function resetBackoff(): void {
  currentDelay = INITIAL_DELAY_MS;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}
