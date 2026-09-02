import '@whiskeysockets/baileys';

declare module '@whiskeysockets/baileys' {
  export type WASocket = ReturnType<typeof import('@whiskeysockets/baileys').default>;
  export type BaileysEventMap = Record<string, unknown>;

  export interface GroupParticipant {
    id: string;
    jid?: string;
    lid?: string;
    admin?: 'admin' | 'superadmin' | null;
  }
}