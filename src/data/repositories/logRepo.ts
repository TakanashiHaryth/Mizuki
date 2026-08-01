/**
 * Repository: admin_actions_log + command_usage_log tables.
 * Write-heavy, read-light — used for audit trails and observability.
 */

import { getPool } from '../db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

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
  await pool.execute(
    `INSERT INTO admin_actions_log (group_id, actor_user_id, target_user_id, action_type)
     VALUES (?, ?, ?, ?)`,
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
  await pool.execute(
    'INSERT INTO command_usage_log (group_id, user_id, command) VALUES (?, ?, ?)',
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
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT al.*, 
            actor.display_name AS actor_name, 
            target.display_name AS target_name
     FROM admin_actions_log al
     LEFT JOIN users actor ON al.actor_user_id = actor.id
     LEFT JOIN users target ON al.target_user_id = target.id
     WHERE al.group_id = ?
     ORDER BY al.created_at DESC
     LIMIT ?`,
    [groupId, limit]
  );
  return rows;
}

/** Removes old command/admin audit rows according to the configured retention. */
export async function pruneOldLogs(retentionDays: number): Promise<number> {
  if (!Number.isInteger(retentionDays) || retentionDays < 1) return 0;

  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [commandResult] = await connection.execute<ResultSetHeader>(
      'DELETE FROM command_usage_log WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [retentionDays]
    );
    const [adminResult] = await connection.execute<ResultSetHeader>(
      'DELETE FROM admin_actions_log WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [retentionDays]
    );
    await connection.commit();
    return commandResult.affectedRows + adminResult.affectedRows;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}
