/**
 * Repository: users table.
 * Handles upsert-on-message, opt-out flag, and lookups.
 */

import { getPool } from '../db';
import { QueryResultRow } from 'pg';

export interface UserRow extends QueryResultRow {
  id: number;
  wa_jid: string;
  display_name: string | null;
  first_seen: Date;
  last_seen: Date | null;
  memory_opt_out: boolean;
}

/**
 * Ensures a user exists in the DB. Creates on first sight, updates last_seen + display_name on every call.
 * Returns the user's internal ID.
 */
export async function upsertUser(waJid: string, displayName?: string): Promise<number> {
  const pool = getPool();

  const { rows } = await pool.query<{ id: number } & QueryResultRow>(
    `INSERT INTO users (wa_jid, display_name, last_seen)
     VALUES ($1, $2, CURRENT_TIMESTAMP)
     ON CONFLICT (wa_jid) DO UPDATE SET
       display_name = COALESCE(EXCLUDED.display_name, users.display_name),
       last_seen = CURRENT_TIMESTAMP
     RETURNING id`,
    [waJid, displayName || null]
  );
  return rows[0].id;
}

/**
 * Fetches a user by their WhatsApp JID.
 */
export async function getUserByJid(waJid: string): Promise<UserRow | null> {
  const pool = getPool();
  const { rows } = await pool.query<UserRow>(
    'SELECT * FROM users WHERE wa_jid = $1',
    [waJid]
  );
  return (rows[0] as UserRow) || null;
}

/**
 * Fetches a user by their internal ID.
 */
export async function getUserById(id: number): Promise<UserRow | null> {
  const pool = getPool();
  const { rows } = await pool.query<UserRow>(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return (rows[0] as UserRow) || null;
}

/**
 * Sets the memory opt-out flag for a user.
 */
export async function setMemoryOptOut(userId: number, optOut: boolean): Promise<void> {
  const pool = getPool();
  await pool.query('UPDATE users SET memory_opt_out = $1 WHERE id = $2', [optOut, userId]);
}

/**
 * Checks whether a user has opted out of AI memory.
 */
export async function isMemoryOptedOut(userId: number): Promise<boolean> {
  const pool = getPool();
  const { rows } = await pool.query<{ memory_opt_out: boolean } & QueryResultRow>(
    'SELECT memory_opt_out FROM users WHERE id = $1',
    [userId]
  );
  return rows[0]?.memory_opt_out === true;
}
