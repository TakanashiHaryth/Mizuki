import { Image } from 'node-webpmux';
import { config } from '../config';

function createStickerExif(): Buffer {
  const metadata = {
    'sticker-pack-id': config.stickerMetadata.packId,
    'sticker-pack-name': config.stickerMetadata.packName,
    'sticker-pack-publisher': config.stickerMetadata.author,
    emojis: ['✨'],
  };
  const json = Buffer.from(JSON.stringify(metadata), 'utf8');
  const tiffHeader = Buffer.from([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
  ]);
  tiffHeader.writeUInt32LE(json.length, 14);
  return Buffer.concat([tiffHeader, json]);
}

/** Adds WhatsApp sticker pack/author metadata without changing the artwork. */
export async function addStickerMetadata(webp: Buffer): Promise<Buffer> {
  const image = new Image();
  await image.load(webp);
  image.exif = createStickerExif();
  return image.save(null);
}
