const test = require('node:test');
const assert = require('node:assert/strict');

const { config } = require('../dist/config');
const { parseMessage } = require('../dist/router/parser');
const { helpHandler } = require('../dist/handlers/general/help');
const { pollHandler } = require('../dist/handlers/utility/poll');
const {
  declaredFileSizeBytes,
  isDeclaredFileSizeAllowed,
  resolveImageMedia,
  resolveVideoMedia,
} = require('../dist/media/messageResolver');
const { MediaJobQueue, MediaQueueFullError } = require('../dist/services/mediaQueue');
const { SingleInstanceLock } = require('../dist/services/singleInstance');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  DEFAULT_PERSONALITY,
  MAX_PERSONALITY_LENGTH,
  buildMizukiSystemPrompt,
  normalizePersonality,
} = require('../dist/services/personality');
const { allHandlers } = require('../dist/router/router');
const {
  isPlatformUrl,
  isAllowedSocialKitDownloadUrl,
  isAllowedTikWmMediaUrl,
  classifySocialKitFailure,
  downloadSocialMedia,
  parseSocialDownloadRequest,
  randomDownloadDelayMs,
  SocialDownloadError,
} = require('../dist/media/socialDownloader');
const {
  LLMRateLimitError,
  LLMTimeoutError,
  classifyGeminiError,
} = require('../dist/llm/geminiAdapter');

test('parser requires a space after the configured prefix and recognizes wake word', () => {
  const command = parseMessage(`${config.bot.prefix} poll Makan? | A | B`);
  assert.equal(command.triggered, true);
  assert.equal(command.command, 'poll');
  assert.deepEqual(command.args, ['Makan?', '|', 'A', '|', 'B']);

  const wake = parseMessage('Mizuki, apa khabar?');
  assert.equal(wake.command, 'ai');
  assert.deepEqual(wake.args, ['apa khabar?']);
  assert.equal(parseMessage('mesej biasa').triggered, false);

  assert.equal(parseMessage(`${config.bot.prefix}poll Makan? | A | B`).triggered, false);
  assert.equal(parseMessage(`${config.bot.prefix}help`).triggered, false);

  const multipleSpaces = parseMessage(`${config.bot.prefix}   ig https://instagram.com/p/example/`);
  assert.equal(multipleSpaces.command, 'ig');
  assert.deepEqual(multipleSpaces.args, ['https://instagram.com/p/example/']);
});

test('help displays a space between the prefix and every command', async () => {
  const result = await helpHandler.execute({});
  assert.equal(typeof result.reply, 'string');
  assert.equal(result.reply.includes(`${config.bot.prefix} help`), true);
  assert.equal(result.reply.includes(`${config.bot.prefix}help`), false);
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
        text: `${config.bot.prefix} sticker`,
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

test('single-instance lock blocks duplicates and releases cleanly', () => {
  const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mizuki-lock-test-'));
  const lockPath = path.join(testDir, '.mizuki.lock');
  const first = new SingleInstanceLock(lockPath);
  const second = new SingleInstanceLock(lockPath);

  try {
    fs.writeFileSync(lockPath, String(Number.MAX_SAFE_INTEGER));
    first.acquire();
    assert.throws(() => second.acquire(), /already running/);
    first.release();
    second.acquire();
    assert.equal(fs.readFileSync(lockPath, 'utf8'), String(process.pid));
  } finally {
    first.release();
    second.release();
    fs.rmSync(testDir, { recursive: true, force: true });
  }
});

test('personality prompt keeps core identity and normalizes custom traits', () => {
  const defaultPrompt = buildMizukiSystemPrompt(null);
  assert.match(defaultPrompt, /bot pembantu untuk WhatsApp/);
  assert.match(defaultPrompt, new RegExp(DEFAULT_PERSONALITY));

  const normalized = normalizePersonality('  ceria\n\t dan   tenang  ');
  assert.equal(normalized, 'ceria dan tenang');
  assert.match(buildMizukiSystemPrompt(normalized), /Sifat Mizuki: ceria dan tenang/);

  const invalidLongValue = 'x'.repeat(MAX_PERSONALITY_LENGTH + 1);
  assert.match(buildMizukiSystemPrompt(invalidLongValue), new RegExp(DEFAULT_PERSONALITY));
});

test('personality command is registered as admin-only without requiring bot admin', () => {
  const handler = allHandlers.find((candidate) => candidate.name === 'personality');
  assert.ok(handler);
  assert.equal(handler.category, 'admin');
  assert.equal(handler.adminOnly, true);
  assert.equal(handler.requiresBotAdmin, false);
});

test('social download commands are separate media handlers', () => {
  for (const name of ['yt', 'tt', 'ig', 'x']) {
    const handler = allHandlers.find((candidate) => candidate.name === name);
    assert.ok(handler, `${name} handler should be registered`);
    assert.equal(handler.category, 'media');
    assert.equal(handler.processingReaction, true);
  }
});

test('social download parser validates platform URLs and audio mode', () => {
  assert.deepEqual(
    parseSocialDownloadRequest('yt', ['audio', 'https://youtu.be/example']),
    { platform: 'yt', mode: 'audio', url: 'https://youtu.be/example' }
  );
  assert.equal(isPlatformUrl('tt', 'https://www.tiktok.com/@mizuki/video/1'), true);
  assert.deepEqual(
    parseSocialDownloadRequest('tt', ['https://www.tiktok.com/@mizuki/photo/1']),
    { platform: 'tt', mode: 'video', url: 'https://www.tiktok.com/@mizuki/photo/1' }
  );
  assert.equal(isPlatformUrl('x', 'https://twitter.com/mizuki/status/1'), true);
  assert.equal(isPlatformUrl('ig', 'https://www.instagram.com/p/example/'), true);
  assert.equal(isPlatformUrl('ig', 'https://evil.example/instagram.com'), false);
  assert.equal(isPlatformUrl('ig', 'http://instagram.com/p/example/'), false);
  assert.equal(isPlatformUrl('ig', 'https://instagram.com.evil.example/p/example/'), false);
  assert.equal(isPlatformUrl('ig', 'https://user:password@instagram.com/p/example/'), false);
  assert.equal(isPlatformUrl('ig', 'https://instagram.com:8443/p/example/'), false);
  assert.throws(
    () => parseSocialDownloadRequest('yt', ['https://www.tiktok.com/@mizuki/video/1']),
    SocialDownloadError
  );
});

test('social download pacing stays inside the configured random range', () => {
  assert.equal(randomDownloadDelayMs(0, 0, () => 0.5), 0);
  assert.equal(randomDownloadDelayMs(5, 10, () => 0), 5000);
  assert.equal(randomDownloadDelayMs(5, 10, () => 0.5), 7500);
  assert.equal(randomDownloadDelayMs(5, 10, () => 1), 10000);
  assert.equal(randomDownloadDelayMs(10, 5, () => 0), 5000);
});

test('SocialKit media URLs are restricted to its HTTPS S3 bucket', () => {
  assert.equal(
    isAllowedSocialKitDownloadUrl('https://socialkit-downloads.s3.amazonaws.com/file.mp4?sig=x'),
    true
  );
  assert.equal(
    isAllowedSocialKitDownloadUrl('https://socialkit-downloads.s3.us-east-1.amazonaws.com/file.mp4'),
    true
  );
  assert.equal(isAllowedSocialKitDownloadUrl('http://socialkit-downloads.s3.amazonaws.com/file.mp4'), false);
  assert.equal(isAllowedSocialKitDownloadUrl('https://localhost/file.mp4'), false);
  assert.equal(
    isAllowedSocialKitDownloadUrl('https://socialkit-downloads.s3.amazonaws.com.evil.example/file.mp4'),
    false
  );
});

test('TikWM media URLs are restricted to HTTPS TikWM and TikTok CDN hosts', () => {
  assert.equal(isAllowedTikWmMediaUrl('https://v16m.tiktokcdn-us.com/video.mp4'), true);
  assert.equal(isAllowedTikWmMediaUrl('https://p16-sign-va.tiktokcdn.com/image.jpeg'), true);
  assert.equal(isAllowedTikWmMediaUrl('https://www.tikwm.com/video/media/play/1.mp4'), true);
  assert.equal(isAllowedTikWmMediaUrl('http://v16m.tiktokcdn-us.com/video.mp4'), false);
  assert.equal(isAllowedTikWmMediaUrl('https://tiktokcdn-us.com.evil.example/video.mp4'), false);
  assert.equal(isAllowedTikWmMediaUrl('https://v16.tiktokcdn-evil.com/video.mp4'), false);
  assert.equal(isAllowedTikWmMediaUrl('https://localhost/video.mp4'), false);
});

test('SocialKit distinguishes temporary rate limits from exhausted free quota', () => {
  assert.equal(classifySocialKitFailure(429, 'Rate limit exceeded, retry in 59 seconds').code, 'SOCIALKIT_RATE_LIMIT');
  assert.equal(classifySocialKitFailure(403, 'Request limit exceeded for this month').code, 'SOCIALKIT_QUOTA');
  assert.equal(classifySocialKitFailure(403, 'Invalid Access key').code, 'SOCIALKIT_KEY_INVALID');
});

test('TikTok short links try both local extractors before the API fallback', async (t) => {
  const childProcess = require('node:child_process');
  const originalExecFile = childProcess.execFile;
  const originalFetch = global.fetch;
  const originalDownloadConfig = { ...config.download };
  const calls = [];

  t.after(() => {
    childProcess.execFile = originalExecFile;
    global.fetch = originalFetch;
    Object.assign(config.download, originalDownloadConfig);
  });

  Object.assign(config.download, {
    socialKitApiKey: 'test-key',
    delayMinSeconds: 0,
    delayMaxSeconds: 0,
  });

  childProcess.execFile = (file, _args, _options, callback) => {
    calls.push(String(file));
    const error = new Error('blocked');
    error.code = 'DOWNLOAD_FAILED';
    callback(error, '', 'HTTP Error 403: Forbidden');
  };

  global.fetch = async (url, options) => {
    if (String(url) === 'https://api.socialkit.dev/tiktok/download') {
      calls.push('socialkit-api');
      assert.equal(options.redirect, 'error');
      assert.equal(options.headers['x-access-key'], 'test-key');
      assert.equal(JSON.parse(options.body).quality, '720p');
      return new Response(JSON.stringify({
        success: true,
        data: {
          downloadUrl: 'https://socialkit-downloads.s3.amazonaws.com/test.mp4',
          fileSize: 4,
          durationSeconds: 2,
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }

    calls.push('socialkit-media');
    return new Response(Uint8Array.from([1, 2, 3, 4]), {
      status: 200,
      headers: { 'content-type': 'video/mp4', 'content-length': '4' },
    });
  };

  const result = await downloadSocialMedia({
    platform: 'tt',
    mode: 'video',
    url: 'https://vt.tiktok.com/example/',
  });

  assert.deepEqual(calls, [
    config.download.ytDlpPath,
    config.download.galleryDlPath,
    'socialkit-api',
    'socialkit-media',
  ]);
  assert.equal(result[0].mimetype, 'video/mp4');
  assert.deepEqual([...result[0].buffer], [1, 2, 3, 4]);
});

test('TikWM takes over after the SocialKit free quota is exhausted', async (t) => {
  const childProcess = require('node:child_process');
  const originalExecFile = childProcess.execFile;
  const originalFetch = global.fetch;
  const originalDownloadConfig = { ...config.download };
  const calls = [];
  let invalidImages = false;

  t.after(() => {
    childProcess.execFile = originalExecFile;
    global.fetch = originalFetch;
    Object.assign(config.download, originalDownloadConfig);
  });

  Object.assign(config.download, {
    socialKitApiKey: 'test-key',
    tikWmEnabled: true,
    delayMinSeconds: 0,
    delayMaxSeconds: 0,
  });

  childProcess.execFile = (file, _args, _options, callback) => {
    calls.push(String(file));
    const error = new Error('blocked');
    error.code = 'DOWNLOAD_FAILED';
    callback(error, '', 'HTTP Error 403: Forbidden');
  };

  global.fetch = async (url, options) => {
    const value = String(url);
    if (value === 'https://api.socialkit.dev/tiktok/download') {
      calls.push('socialkit-api');
      return new Response(JSON.stringify({
        success: false,
        message: 'Request limit exceeded for this month',
      }), { status: 403, headers: { 'content-type': 'application/json' } });
    }
    if (value.startsWith('https://www.tikwm.com/api/')) {
      calls.push('tikwm-api');
      const apiUrl = new URL(value);
      assert.equal(apiUrl.searchParams.get('url'), 'https://vt.tiktok.com/example/');
      assert.equal(apiUrl.searchParams.get('hd'), '1');
      assert.equal(options.redirect, 'error');
      return new Response(JSON.stringify({
        code: 0,
        msg: 'success',
        data: invalidImages ? { images: [null, ''] } : {
          duration: 2,
          hdplay: 'https://v16m.tiktokcdn-us.com/test.mp4',
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }

    calls.push('tikwm-media');
    assert.equal(options.redirect, 'error');
    return new Response(Uint8Array.from([5, 6, 7, 8]), {
      status: 200,
      headers: { 'content-type': 'video/mp4', 'content-length': '4' },
    });
  };

  const result = await downloadSocialMedia({
    platform: 'tt',
    mode: 'video',
    url: 'https://vt.tiktok.com/example/?utm_source=share#tracking',
  });

  assert.deepEqual(calls, [
    config.download.ytDlpPath,
    config.download.galleryDlPath,
    'socialkit-api',
    'tikwm-api',
    'tikwm-media',
  ]);
  assert.deepEqual([...result[0].buffer], [5, 6, 7, 8]);

  invalidImages = true;
  await assert.rejects(
    () => downloadSocialMedia({
      platform: 'tt',
      mode: 'video',
      url: 'https://vt.tiktok.com/example/',
    }),
    (err) => err instanceof SocialDownloadError && err.code === 'TIKWM_NO_OUTPUT'
  );
});

test('TikTok audio login challenges fall back to the configured APIs', async (t) => {
  const childProcess = require('node:child_process');
  const originalExecFile = childProcess.execFile;
  const originalFetch = global.fetch;
  const originalDownloadConfig = { ...config.download };
  const calls = [];

  t.after(() => {
    childProcess.execFile = originalExecFile;
    global.fetch = originalFetch;
    Object.assign(config.download, originalDownloadConfig);
  });

  Object.assign(config.download, {
    socialKitApiKey: 'test-key',
    tikWmEnabled: true,
    delayMinSeconds: 0,
    delayMaxSeconds: 0,
  });

  childProcess.execFile = (file, _args, _options, callback) => {
    calls.push(String(file));
    const error = new Error('login required');
    error.code = 'DOWNLOAD_FAILED';
    callback(error, '', 'Sign in to confirm you are not a bot');
  };

  global.fetch = async (url) => {
    if (String(url) === 'https://api.socialkit.dev/tiktok/download') {
      calls.push('socialkit-api');
      return new Response(JSON.stringify({
        success: true,
        data: {
          downloadUrl: 'https://socialkit-downloads.s3.amazonaws.com/test.mp3',
          fileSize: 4,
          durationSeconds: 2,
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }

    calls.push('socialkit-media');
    return new Response(Uint8Array.from([9, 10, 11, 12]), {
      status: 200,
      headers: { 'content-type': 'audio/mpeg', 'content-length': '4' },
    });
  };

  const result = await downloadSocialMedia({
    platform: 'tt',
    mode: 'audio',
    url: 'https://vt.tiktok.com/example/',
  });

  assert.deepEqual(calls, [config.download.ytDlpPath, 'socialkit-api', 'socialkit-media']);
  assert.equal(result[0].mimetype, 'audio/mpeg');
});

test('Gemini transient errors are classified for clear user feedback', () => {
  assert.ok(classifyGeminiError({ status: 429, message: 'quota' }) instanceof LLMRateLimitError);
  assert.ok(
    classifyGeminiError({ status: 499, message: 'The operation was cancelled.' }) instanceof LLMTimeoutError
  );
  assert.ok(classifyGeminiError(new Error('timed out')) instanceof LLMTimeoutError);

  const ordinary = new Error('ordinary provider error');
  assert.equal(classifyGeminiError(ordinary), ordinary);
});
