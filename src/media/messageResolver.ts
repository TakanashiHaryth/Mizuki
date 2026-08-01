/** Resolves direct and quoted media through Baileys message wrappers. */

import { normalizeMessageContent, proto } from '@whiskeysockets/baileys';

export type VideoMediaKind = 'video' | 'gif';

export interface ResolvedVideoMedia {
  content: proto.IMessage;
  videoMessage?: proto.Message.IVideoMessage;
  documentMessage?: proto.Message.IDocumentMessage;
}

export interface ResolvedImageMedia {
  content: proto.IMessage;
  imageMessage: proto.Message.IImageMessage;
}

export interface ResolvedStickerMedia {
  content: proto.IMessage;
  stickerMessage: proto.Message.IStickerMessage;
}

function candidatesFrom(message: proto.IWebMessageInfo): proto.IMessage[] {
  const direct = normalizeMessageContent(message.message);
  if (!direct) return [];
  const quoted = normalizeMessageContent(
    direct.extendedTextMessage?.contextInfo?.quotedMessage
  );
  return [direct, quoted].filter((value): value is proto.IMessage => !!value);
}

function isGifDocument(document: proto.Message.IDocumentMessage): boolean {
  const mimetype = document.mimetype?.toLowerCase() || '';
  const fileName = document.fileName?.toLowerCase() || '';
  return mimetype === 'image/gif' || fileName.endsWith('.gif');
}

export function resolveVideoMedia(
  message: proto.IWebMessageInfo,
  expectedKind: VideoMediaKind
): ResolvedVideoMedia | null {
  for (const content of candidatesFrom(message)) {
    const video = content.videoMessage;
    if (video) {
      const isGif = video.gifPlayback === true;
      if ((expectedKind === 'gif' && isGif) || (expectedKind === 'video' && !isGif)) {
        return { content, videoMessage: video };
      }
    }

    const document = content.documentMessage;
    if (document) {
      const isGif = isGifDocument(document);
      const isVideo = document.mimetype?.toLowerCase().startsWith('video/') === true;
      if (
        (expectedKind === 'gif' && isGif) ||
        (expectedKind === 'video' && isVideo && !isGif)
      ) {
        return { content, documentMessage: document };
      }
    }
  }
  return null;
}

export function resolveImageMedia(message: proto.IWebMessageInfo): ResolvedImageMedia | null {
  for (const content of candidatesFrom(message)) {
    if (content.imageMessage) {
      return { content, imageMessage: content.imageMessage };
    }
  }
  return null;
}

export function resolveStickerMedia(message: proto.IWebMessageInfo): ResolvedStickerMedia | null {
  for (const content of candidatesFrom(message)) {
    if (content.stickerMessage) {
      return { content, stickerMessage: content.stickerMessage };
    }
  }
  return null;
}

/** Converts Baileys' number/Long fileLength representation to bytes. */
export function declaredFileSizeBytes(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null;
  if (typeof value === 'bigint') {
    const converted = Number(value);
    return Number.isSafeInteger(converted) && converted >= 0 ? converted : null;
  }

  try {
    const converted = Number(value);
    return Number.isFinite(converted) && converted >= 0 ? converted : null;
  } catch {
    return null;
  }
}

export function isDeclaredFileSizeAllowed(value: unknown, maxBytes: number): boolean {
  const size = declaredFileSizeBytes(value);
  return size === null || size <= maxBytes;
}
