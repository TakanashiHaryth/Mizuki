/**
 * Rate limiting service.
 * Per-command cooldowns via the rate_limits DB table.
 * Global send-rate cap via an in-memory token bucket.
 */

import { getPool } from '../data/db';
import { QueryResultRow } from 'pg';
import { logger } from './logger';

interface CooldownRow extends QueryResultRow {
  last_used_at: Date;
}

interface UserRateLimitRow extends QueryResultRow {
  usage_count: number;
  elapsed_seconds: number;
}

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

  const { rows } = await pool.query<CooldownRow>(
    'SELECT last_used_at FROM rate_limits WHERE group_id = $1 AND command = $2',
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

  await pool.query(
    `INSERT INTO rate_limits (group_id, command, last_used_at)
     VALUES ($1, $2, CURRENT_TIMESTAMP)
     ON CONFLICT (group_id, command) DO UPDATE SET last_used_at = CURRENT_TIMESTAMP`,
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
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    // Create the counter row without consuming a use. ON CONFLICT also
    // serializes the first simultaneous requests on the unique key.
    await client.query(
      `INSERT INTO user_rate_limits
         (user_id, action, window_started_at, usage_count)
       VALUES ($1, $2, CURRENT_TIMESTAMP, 0)
       ON CONFLICT (user_id, action) DO NOTHING`,
      [userId, action]
    );
    const { rows } = await client.query<UserRateLimitRow>(
      `SELECT usage_count,
              EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - window_started_at)) AS elapsed_seconds
       FROM user_rate_limits
       WHERE user_id = $1 AND action = $2
       FOR UPDATE`,
      [userId, action]
    );

    if (rows.length === 0) throw new Error('Failed to initialize user rate limit row');

    const elapsed = Math.max(0, Number(rows[0].elapsed_seconds) || 0);
    if (elapsed >= windowSeconds) {
      await client.query(
        `UPDATE user_rate_limits
         SET window_started_at = CURRENT_TIMESTAMP, usage_count = 1
         WHERE user_id = $1 AND action = $2`,
        [userId, action]
      );
      await client.query('COMMIT');
      return { allowed: true, remainingSeconds: 0 };
    }

    if (Number(rows[0].usage_count) >= maxUses) {
      await client.query('COMMIT');
      return {
        allowed: false,
        remainingSeconds: Math.max(1, windowSeconds - elapsed),
      };
    }

    await client.query(
      `UPDATE user_rate_limits
       SET usage_count = usage_count + 1
       WHERE user_id = $1 AND action = $2`,
      [userId, action]
    );
    await client.query('COMMIT');
    return { allowed: true, remainingSeconds: 0 };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
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
