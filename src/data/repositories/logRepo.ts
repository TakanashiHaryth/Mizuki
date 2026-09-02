/**
 * Repository: admin_actions_log + command_usage_log tables.
 * Write-heavy, read-light — used for audit trails and observability.
 */

import { getPool } from '../db';
import { QueryResultRow } from 'pg';

/**
 * Logs an admin action (kick, promote, demote, tagall).
 */
export async function logAdminAction(
  groupId: number,
  actorUserId: number,
  targetUserId: number | null,
  actionType: 'kick' | 'promote' | 'demote' | 'tagall'
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO admin_actions_log (group_id, actor_user_id, target_user_id, action_type)
     VALUES ($1, $2, $3, $4)`,
    [groupId, actorUserId, targetUserId, actionType]
  );
}

/**
 * Logs every command execution (for observability, regardless of success/failure).
 */
export async function logCommandUsage(
  groupId: number | null,
  userId: number,
  command: string
): Promise<void> {
  const pool = getPool();
  await pool.query(
    'INSERT INTO command_usage_log (group_id, user_id, command) VALUES ($1, $2, $3)',
    [groupId, userId, command]
  );
}

/**
 * Gets recent admin actions for a group (for potential dashboard/audit use).
 */
export async function getAdminActions(
  groupId: number,
  limit: number = 50
): Promise<any[]> {
  const pool = getPool();
  const { rows } = await pool.query<QueryResultRow>(
    `SELECT al.*, 
            actor.display_name AS actor_name, 
            target.display_name AS target_name
     FROM admin_actions_log al
     LEFT JOIN users actor ON al.actor_user_id = actor.id
     LEFT JOIN users target ON al.target_user_id = target.id
     WHERE al.group_id = $1
     ORDER BY al.created_at DESC
     LIMIT $2`,
    [groupId, limit]
  );
  return rows;
}

/** Removes old command/admin audit rows according to the configured retention. */
export async function pruneOldLogs(retentionDays: number): Promise<number> {
  if (!Number.isInteger(retentionDays) || retentionDays < 1) return 0;

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const commandResult = await client.query(
      `DELETE FROM command_usage_log
       WHERE created_at < CURRENT_TIMESTAMP - ($1 * INTERVAL '1 day')`,
      [retentionDays]
    );
    const adminResult = await client.query(
      `DELETE FROM admin_actions_log
       WHERE created_at < CURRENT_TIMESTAMP - ($1 * INTERVAL '1 day')`,
      [retentionDays]
    );
    await client.query('COMMIT');
    return (commandResult.rowCount || 0) + (adminResult.rowCount || 0);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
