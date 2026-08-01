const test = require('node:test');
const assert = require('node:assert/strict');

const { config } = require('../dist/config');
const { parseMessage } = require('../dist/router/parser');
const { pollHandler } = require('../dist/handlers/utility/poll');
const {
  declaredFileSizeBytes,
  isDeclaredFileSizeAllowed,
  resolveImageMedia,
  resolveVideoMedia,
} = require('../dist/media/messageResolver');
const { MediaJobQueue, MediaQueueFullError } = require('../dist/services/mediaQueue');

test('parser recognizes configured prefix and wake word', () => {
  const command = parseMessage(`${config.bot.prefix}poll Makan? | A | B`);
  assert.equal(command.triggered, true);
  assert.equal(command.command, 'poll');
  assert.deepEqual(command.args, ['Makan?', '|', 'A', '|', 'B']);

  const wake = parseMessage('Mizuki, apa khabar?');
  assert.equal(wake.command, 'ai');
  assert.deepEqual(wake.args, ['apa khabar?']);
  assert.equal(parseMessage('mesej biasa').triggered, false);
});

test('poll creates native poll and rejects duplicate choices', async () => {
  const base = {
    message: {}, sender: { waJid: 'u', userId: 1 },
    group: { waGroupId: 'g', groupId: 1 }, rawText: '',
  };
  const valid = await pollHandler.execute({ ...base, args: ['Makan?', '|', 'Nasi', '|', 'Mee'] });
  assert.equal(valid.success, true);
  assert.deepEqual(valid.reply.options, ['Nasi', 'Mee']);

  const duplicate = await pollHandler.execute({ ...base, args: ['Makan?', '|', 'Nasi', '|', 'nasi'] });
  assert.equal(duplicate.success, false);
  assert.equal(duplicate.error, 'Duplicate poll options');
});

test('media resolver detects wrapped and quoted media', () => {
  const wrappedVideo = {
    key: {},
    message: { viewOnceMessage: { message: { videoMessage: { gifPlayback: false, fileLength: 123 } } } },
  };
  assert.equal(resolveVideoMedia(wrappedVideo, 'video').videoMessage.fileLength, 123);

  const quotedImage = {
    key: {},
    message: {
      extendedTextMessage: {
        text: `${config.bot.prefix}sticker`,
        contextInfo: { quotedMessage: { imageMessage: { fileLength: 456 } } },
      },
    },
  };
  assert.equal(resolveImageMedia(quotedImage).imageMessage.fileLength, 456);
});

test('declared media size is checked before download', () => {
  assert.equal(declaredFileSizeBytes(1024n), 1024);
  assert.equal(isDeclaredFileSizeAllowed(10, 10), true);
  assert.equal(isDeclaredFileSizeAllowed(11, 10), false);
  assert.equal(isDeclaredFileSizeAllowed(undefined, 10), true);
});

test('media queue limits concurrency and rejects overflow', async () => {
  const queue = new MediaJobQueue(1, 1);
  let release;
  const first = queue.run(() => new Promise((resolve) => { release = resolve; }));
  const second = queue.run(async () => 'second');

  assert.equal(queue.active, 1);
  assert.equal(queue.queued, 1);
  await assert.rejects(queue.run(async () => 'third'), MediaQueueFullError);

  release('first');
  assert.deepEqual(await Promise.all([first, second]), ['first', 'second']);
  assert.equal(queue.active, 0);
});
