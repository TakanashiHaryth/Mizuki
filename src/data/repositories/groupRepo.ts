/**
 * Repository: groups + group_members tables.
 * Auto-creates groups and memberships when the bot encounters them.
 */

import { getPool } from '../db';
import { QueryResultRow } from 'pg';

export interface GroupRow extends QueryResultRow {
  id: number;
  wa_group_id: string;
  name: string | null;
  personality: string | null;
  created_at: Date;
}

export interface GroupMemberRow extends QueryResultRow {
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

  const { rows } = await pool.query<{ id: number } & QueryResultRow>(
    `INSERT INTO groups (wa_group_id, name)
     VALUES ($1, $2)
     ON CONFLICT (wa_group_id) DO UPDATE SET
       name = COALESCE(EXCLUDED.name, groups.name)
     RETURNING id`,
    [waGroupId, name || null]
  );
  return rows[0].id;
}

/**
 * Fetches a group by its WhatsApp group JID.
 */
export async function getGroupByWaId(waGroupId: string): Promise<GroupRow | null> {
  const pool = getPool();
  const { rows } = await pool.query<GroupRow>(
    'SELECT * FROM groups WHERE wa_group_id = $1',
    [waGroupId]
  );
  return (rows[0] as GroupRow) || null;
}

/** Returns this group's custom Mizuki traits, or null for the default. */
export async function getGroupPersonality(groupId: number): Promise<string | null> {
  const pool = getPool();
  const { rows } = await pool.query<{ personality: string | null } & QueryResultRow>(
    'SELECT personality FROM groups WHERE id = $1',
    [groupId]
  );
  return rows[0]?.personality ?? null;
}

/** Sets custom Mizuki traits; null restores the built-in default. */
export async function setGroupPersonality(
  groupId: number,
  personality: string | null
): Promise<void> {
  const pool = getPool();
  await pool.query(
    'UPDATE groups SET personality = $1 WHERE id = $2',
    [personality, groupId]
  );
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
  await pool.query(
    `INSERT INTO group_members (group_id, user_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (group_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
    [groupId, userId, role]
  );
}

/**
 * Removes a member from a group.
 */
export async function removeGroupMember(groupId: number, userId: number): Promise<void> {
  const pool = getPool();
  await pool.query(
    'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
    [groupId, userId]
  );
}

/**
 * Gets all members of a group.
 */
export async function getGroupMembers(groupId: number): Promise<GroupMemberRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<GroupMemberRow>(
    'SELECT * FROM group_members WHERE group_id = $1',
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
  const { rows } = await pool.query<GroupMemberRow>(
    'SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2',
    [groupId, userId]
  );
  return (rows[0] as GroupMemberRow) || null;
}

/**
 * Counts total members in a group.
 */
export async function getGroupMemberCount(groupId: number): Promise<number> {
  const pool = getPool();
  const { rows } = await pool.query<{ count: string } & QueryResultRow>(
    'SELECT COUNT(*) AS count FROM group_members WHERE group_id = $1',
    [groupId]
  );
  return Number(rows[0].count);
}
