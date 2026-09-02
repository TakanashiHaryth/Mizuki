/**
 * Repository: ai_memory table.
 * Manages the rolling conversation window for per-user AI memory.
 */

import { getPool } from '../db';
import { QueryResultRow } from 'pg';
import { config } from '../../config';

export interface MemoryRow extends QueryResultRow {
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

  const { rows } = await pool.query<MemoryRow>(
    `SELECT * FROM (
       SELECT * FROM ai_memory
       WHERE user_id = $1 AND group_id = $2
       ORDER BY created_at DESC, id DESC LIMIT $3
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
  await pool.query(
    'INSERT INTO ai_memory (user_id, group_id, role, content) VALUES ($1, $2, $3, $4)',
    [userId, groupId, role, content]
  );
}

/** Stores both sides of one exchange atomically to avoid partial conversation history. */
export async function addMemoryExchange(
  userId: number,
  groupId: number,
  userMessage: string,
  assistantMessage: string
): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO ai_memory (user_id, group_id, role, content)
       VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)`,
      [
        userId, groupId, 'user', userMessage,
        userId, groupId, 'assistant', assistantMessage,
      ]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Prunes old memory rows beyond the rolling window.
 * Keeps only the most recent (memoryWindow * 2) rows per user and group.
 */
export async function pruneMemory(userId: number, groupId: number): Promise<void> {
  const pool = getPool();
  const limit = config.bot.memoryWindow * 2;

  await pool.query(
    `WITH keep AS (
       SELECT id FROM ai_memory
       WHERE user_id = $1 AND group_id = $2
       ORDER BY created_at DESC, id DESC
       LIMIT $3
     )
     DELETE FROM ai_memory
     WHERE user_id = $1
       AND group_id = $2
       AND id NOT IN (
         SELECT id FROM keep
       )`,
    [userId, groupId, limit]
  );
}

/**
 * Deletes ALL memory for a user (used by the forgetme command).
 */
export async function deleteAllMemory(userId: number): Promise<void> {
  const pool = getPool();
  await pool.query('DELETE FROM ai_memory WHERE user_id = $1', [userId]);
}
