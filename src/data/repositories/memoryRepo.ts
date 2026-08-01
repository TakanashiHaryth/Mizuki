/**
 * Repository: ai_memory table.
 * Manages the rolling conversation window for per-user AI memory.
 */

import { getPool } from '../db';
import { RowDataPacket } from 'mysql2';
import { config } from '../../config';

export interface MemoryRow {
  id: number;
  user_id: number;
  group_id: number | null;
  role: 'user' | 'assistant';
  content: string;
  created_at: Date;
}

/**
 * Loads the most recent N memory entries for a user in one group.
 * N = config.bot.memoryWindow * 2 (each exchange = 1 user + 1 assistant row).
 */
export async function loadMemory(userId: number, groupId: number): Promise<MemoryRow[]> {
  const pool = getPool();
  const limit = config.bot.memoryWindow * 2;

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM (
       SELECT * FROM ai_memory
       WHERE user_id = ? AND group_id = ?
       ORDER BY created_at DESC, id DESC LIMIT ?
     ) AS recent ORDER BY created_at ASC, id ASC`,
    [userId, groupId, limit]
  );
  return rows as MemoryRow[];
}

/**
 * Appends a new memory entry (user or assistant message).
 */
export async function addMemory(
  userId: number,
  groupId: number | null,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  const pool = getPool();
  await pool.execute(
    'INSERT INTO ai_memory (user_id, group_id, role, content) VALUES (?, ?, ?, ?)',
    [userId, groupId, role, content]
  );
}

/**
 * Prunes old memory rows beyond the rolling window.
 * Keeps only the most recent (memoryWindow * 2) rows per user and group.
 */
export async function pruneMemory(userId: number, groupId: number): Promise<void> {
  const pool = getPool();
  const limit = config.bot.memoryWindow * 2;

  // MySQL doesn't allow DELETE with LIMIT in a subquery on the same table,
  // so we use a derived-table workaround (documented in Part 3 of the spec).
  await pool.execute(
    `DELETE FROM ai_memory
     WHERE user_id = ?
       AND group_id = ?
       AND id NOT IN (
         SELECT id FROM (
           SELECT id FROM ai_memory
           WHERE user_id = ? AND group_id = ?
           ORDER BY created_at DESC, id DESC LIMIT ?
         ) AS keep
       )`,
    [userId, groupId, userId, groupId, limit]
  );
}

/**
 * Deletes ALL memory for a user (used by the forgetme command).
 */
export async function deleteAllMemory(userId: number): Promise<void> {
  const pool = getPool();
  await pool.execute('DELETE FROM ai_memory WHERE user_id = ?', [userId]);
}
