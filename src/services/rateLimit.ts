/**
 * Rate limiting service.
 * Per-command cooldowns via the rate_limits DB table.
 * Global send-rate cap via an in-memory token bucket.
 */

import { getPool } from '../data/db';
import { RowDataPacket } from 'mysql2';
import { logger } from './logger';

/**
 * Checks if a command is on cooldown for a group.
 * Returns { onCooldown: false } if clear, or { onCooldown: true, remainingSeconds } if not.
 */
export async function checkCooldown(
  groupId: number,
  command: string,
  cooldownSeconds: number
): Promise<{ onCooldown: boolean; remainingSeconds: number }> {
  const pool = getPool();

  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT last_used_at FROM rate_limits WHERE group_id = ? AND command = ?',
    [groupId, command]
  );

  if (rows.length === 0) {
    return { onCooldown: false, remainingSeconds: 0 };
  }

  const lastUsed = new Date(rows[0].last_used_at).getTime();
  const now = Date.now();
  const elapsed = (now - lastUsed) / 1000;

  if (elapsed < cooldownSeconds) {
    const remaining = Math.ceil(cooldownSeconds - elapsed);
    return { onCooldown: true, remainingSeconds: remaining };
  }

  return { onCooldown: false, remainingSeconds: 0 };
}

/**
 * Records that a command was just used (resets the cooldown timer).
 */
export async function recordUsage(groupId: number, command: string): Promise<void> {
  const pool = getPool();

  await pool.execute(
    `INSERT INTO rate_limits (group_id, command, last_used_at)
     VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE last_used_at = NOW()`,
    [groupId, command]
  );
}

/**
 * Atomically consumes one use from a persistent per-user fixed window.
 * The row is locked while it is checked so simultaneous messages cannot
 * bypass the limit.
 */
export async function consumeUserRateLimit(
  userId: number,
  action: string,
  maxUses: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remainingSeconds: number }> {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    // Create the counter row without consuming a use. INSERT IGNORE also
    // serializes the first simultaneous requests on the unique key.
    await connection.execute(
      `INSERT IGNORE INTO user_rate_limits
         (user_id, action, window_started_at, usage_count)
       VALUES (?, ?, NOW(), 0)`,
      [userId, action]
    );
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT usage_count,
              TIMESTAMPDIFF(SECOND, window_started_at, NOW()) AS elapsed_seconds
       FROM user_rate_limits
       WHERE user_id = ? AND action = ?
       FOR UPDATE`,
      [userId, action]
    );

    if (rows.length === 0) throw new Error('Failed to initialize user rate limit row');

    const elapsed = Math.max(0, Number(rows[0].elapsed_seconds) || 0);
    if (elapsed >= windowSeconds) {
      await connection.execute(
        `UPDATE user_rate_limits
         SET window_started_at = NOW(), usage_count = 1
         WHERE user_id = ? AND action = ?`,
        [userId, action]
      );
      await connection.commit();
      return { allowed: true, remainingSeconds: 0 };
    }

    if (Number(rows[0].usage_count) >= maxUses) {
      await connection.commit();
      return {
        allowed: false,
        remainingSeconds: Math.max(1, windowSeconds - elapsed),
      };
    }

    await connection.execute(
      `UPDATE user_rate_limits
       SET usage_count = usage_count + 1
       WHERE user_id = ? AND action = ?`,
      [userId, action]
    );
    await connection.commit();
    return { allowed: true, remainingSeconds: 0 };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

// ─── Global send-rate token bucket (in-memory, resets on restart) ───

const BUCKET_MAX_TOKENS = 30; // max messages per window
const BUCKET_REFILL_RATE = 1; // tokens per second
let bucketTokens = BUCKET_MAX_TOKENS;
let lastRefill = Date.now();

/**
 * Attempts to consume one token from the global send-rate bucket.
 * Returns true if sending is allowed, false if the bot should slow down.
 */
export function consumeSendToken(): boolean {
  const now = Date.now();
  const elapsed = (now - lastRefill) / 1000;

  // Refill tokens based on elapsed time
  bucketTokens = Math.min(BUCKET_MAX_TOKENS, bucketTokens + elapsed * BUCKET_REFILL_RATE);
  lastRefill = now;

  if (bucketTokens >= 1) {
    bucketTokens -= 1;
    return true;
  }

  logger.warn('Global send-rate limit reached, message throttled');
  return false;
}
