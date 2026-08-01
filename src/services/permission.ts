/**
 * Permission service.
 * Checks live admin status via Baileys group metadata — never trusts the cached DB role.
 */

import {
  areJidsSameUser,
  GroupParticipant,
  WASocket,
} from '@whiskeysockets/baileys';
import { logger, maskJid } from './logger';

/**
 * Matches a group participant against any known form of a WhatsApp identity.
 * Modern LID-addressed groups expose anonymous @lid IDs alongside phone-number
 * JIDs, so comparing participant.id alone is not reliable.
 */
function participantMatches(
  participant: GroupParticipant,
  targetJids: Array<string | undefined>
): boolean {
  const participantJids = [participant.id, participant.jid, participant.lid];

  return participantJids.some((participantJid) =>
    targetJids.some(
      (targetJid) =>
        !!participantJid &&
        !!targetJid &&
        (participantJid === targetJid || areJidsSameUser(participantJid, targetJid))
    )
  );
}

/**
 * Checks whether a sender is an admin in a group by fetching LIVE group metadata.
 * The cached group_members.role column is for display only — this is the authoritative check.
 *
 * @param sock - Baileys socket
 * @param groupJid - WhatsApp group JID (e.g. "120363xxx@g.us")
 * @param senderJid - WhatsApp sender JID (e.g. "6012xxx@s.whatsapp.net")
 * @returns true if the sender is an admin or superadmin
 */
export async function isAdmin(
  sock: WASocket,
  groupJid: string,
  senderJid: string
): Promise<boolean> {
  try {
    const metadata = await sock.groupMetadata(groupJid);
    const participant = metadata.participants.find(
      (p) => participantMatches(p, [senderJid])
    );
    return participant?.admin === 'admin' || participant?.admin === 'superadmin';
  } catch (err) {
    logger.error(
      { err, group: maskJid(groupJid), sender: maskJid(senderJid) },
      'Failed to fetch group metadata for permission check'
    );
    return false;
  }
}

/**
 * Checks whether the bot itself is an admin in the group.
 * Required for admin actions like kick/promote/demote.
 */
export async function isBotAdmin(
  sock: WASocket,
  groupJid: string
): Promise<boolean> {
  try {
    const bot = sock.user;
    if (!bot?.id) return false;

    const metadata = await sock.groupMetadata(groupJid);
    const botParticipant = metadata.participants.find(
      (p) => participantMatches(p, [bot.id, bot.jid, bot.lid])
    );
    return botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin';
  } catch (err) {
    logger.error({ err, group: maskJid(groupJid) }, 'Failed to check bot admin status');
    return false;
  }
}
