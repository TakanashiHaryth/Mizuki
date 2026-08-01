/**
 * Repository: groups + group_members tables.
 * Auto-creates groups and memberships when the bot encounters them.
 */

import { getPool } from '../db';
import { RowDataPacket } from 'mysql2';

export interface GroupRow {
  id: number;
  wa_group_id: string;
  name: string | null;
  created_at: Date;
}

export interface GroupMemberRow {
  id: number;
  group_id: number;
  user_id: number;
  role: 'member' | 'admin';
  joined_at: Date;
}

/**
 * Ensures a group exists. Creates on first encounter, updates name on every call.
 * Returns the group's internal ID.
 */
export async function upsertGroup(waGroupId: string, name?: string): Promise<number> {
  const pool = getPool();

  await pool.execute(
    `INSERT INTO \`groups\` (wa_group_id, name)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE
       name = COALESCE(VALUES(name), name)`,
    [waGroupId, name || null]
  );

  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM `groups` WHERE wa_group_id = ?',
    [waGroupId]
  );
  return rows[0].id;
}

/**
 * Fetches a group by its WhatsApp group JID.
 */
export async function getGroupByWaId(waGroupId: string): Promise<GroupRow | null> {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM `groups` WHERE wa_group_id = ?',
    [waGroupId]
  );
  return (rows[0] as GroupRow) || null;
}

/**
 * Ensures a user is recorded as a member of a group.
 * Updates role if it has changed.
 */
export async function upsertGroupMember(
  groupId: number,
  userId: number,
  role: 'member' | 'admin' = 'member'
): Promise<void> {
  const pool = getPool();
  await pool.execute(
    `INSERT INTO group_members (group_id, user_id, role)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE role = VALUES(role)`,
    [groupId, userId, role]
  );
}

/**
 * Removes a member from a group.
 */
export async function removeGroupMember(groupId: number, userId: number): Promise<void> {
  const pool = getPool();
  await pool.execute(
    'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
    [groupId, userId]
  );
}

/**
 * Gets all members of a group.
 */
export async function getGroupMembers(groupId: number): Promise<GroupMemberRow[]> {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM group_members WHERE group_id = ?',
    [groupId]
  );
  return rows as GroupMemberRow[];
}

/**
 * Gets a specific group member record.
 */
export async function getGroupMember(
  groupId: number,
  userId: number
): Promise<GroupMemberRow | null> {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM group_members WHERE group_id = ? AND user_id = ?',
    [groupId, userId]
  );
  return (rows[0] as GroupMemberRow) || null;
}

/**
 * Counts total members in a group.
 */
export async function getGroupMemberCount(groupId: number): Promise<number> {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT COUNT(*) as count FROM group_members WHERE group_id = ?',
    [groupId]
  );
  return rows[0].count;
}
