/**
 * Repository: users table.
 * Handles upsert-on-message, opt-out flag, and lookups.
 */

import { getPool } from '../db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export interface UserRow {
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

  await pool.execute(
    `INSERT INTO users (wa_jid, display_name, last_seen)
     VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       display_name = COALESCE(VALUES(display_name), display_name),
       last_seen = NOW()`,
    [waJid, displayName || null]
  );

  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM users WHERE wa_jid = ?',
    [waJid]
  );
  return rows[0].id;
}

/**
 * Fetches a user by their WhatsApp JID.
 */
export async function getUserByJid(waJid: string): Promise<UserRow | null> {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM users WHERE wa_jid = ?',
    [waJid]
  );
  return (rows[0] as UserRow) || null;
}

/**
 * Fetches a user by their internal ID.
 */
export async function getUserById(id: number): Promise<UserRow | null> {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM users WHERE id = ?',
    [id]
  );
  return (rows[0] as UserRow) || null;
}

/**
 * Sets the memory opt-out flag for a user.
 */
export async function setMemoryOptOut(userId: number, optOut: boolean): Promise<void> {
  const pool = getPool();
  await pool.execute('UPDATE users SET memory_opt_out = ? WHERE id = ?', [optOut, userId]);
}

/**
 * Checks whether a user has opted out of AI memory.
 */
export async function isMemoryOptedOut(userId: number): Promise<boolean> {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT memory_opt_out FROM users WHERE id = ?',
    [userId]
  );
  return rows[0]?.memory_opt_out === 1;
}
