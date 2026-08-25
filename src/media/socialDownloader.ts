import { execFile } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { setTimeout as sleep } from 'timers/promises';
import { config } from '../config';

export type DownloadPlatform = 'tt' | 'ig' | 'yt' | 'x';
export type DownloadMode = 'video' | 'audio';
export type DownloadedMediaType = 'video' | 'audio' | 'image';

const PLATFORM_HOSTS: Record<DownloadPlatform, string[]> = {
  tt: ['tiktok.com'],
  ig: ['instagram.com'],
  yt: ['youtube.com', 'youtu.be'],
  x: ['x.com', 'twitter.com'],
};

const SOCIALKIT_API_URL = 'https://api.socialkit.dev/tiktok/download';
const SOCIALKIT_DOWNLOAD_HOST = /^socialkit-downloads\.s3(?:\.[a-z0-9-]+)?\.amazonaws\.com$/i;
const TIKWM_API_URL = 'https://www.tikwm.com/api/';
const TIKWM_MEDIA_ROOT_HOSTS = ['tikwm.com', 'tiktokcdn.com', 'tiktokcdn-us.com'];
const LOCAL_FALLBACK_CODES = new Set([
  'PLATFORM_BLOCKED',
  'PLATFORM_CHANGED',
  'DOWNLOAD_FAILED',
  'UNAVAILABLE',
  'LOGIN_REQUIRED',
  'YT_DLP_MISSING',
  'GALLERY_FAILED',
  'GALLERY_LOGIN_REQUIRED',
  'GALLERY_DL_MISSING',
]);

interface SocialKitResponse {
  success?: boolean;
  error?: string;
  message?: string;
  data?: {
    downloadUrl?: string;
    fileSize?: number;
    durationSeconds?: number;
  };
}

interface TikWmResponse {
  code?: number;
  msg?: string;
  data?: {
    duration?: number | string;
    play?: string;
    hdplay?: string;
    music?: string;
    images?: string[];
    music_info?: { play?: string };
  };
}

export class SocialDownloadError extends Error {
  constructor(
    public readonly code: string,
    public readonly userMessage: string
  ) {
    super(code);
    this.name = 'SocialDownloadError';
  }
}

export interface SocialDownloadRequest {
  platform: DownloadPlatform;
  mode: DownloadMode;
  url: string;
}

export interface DownloadedSocialMedia {
  buffer: Buffer;
  type: DownloadedMediaType;
  mimetype: 'video/mp4' | 'audio/mpeg' | 'audio/mp4' | 'image/jpeg' | 'image/png' | 'image/webp';
}

const OUTPUT_TYPES: Record<string, Omit<DownloadedSocialMedia, 'buffer'>> = {
  '.mp4': { type: 'video', mimetype: 'video/mp4' },
  '.mp3': { type: 'audio', mimetype: 'audio/mpeg' },
  '.jpg': { type: 'image', mimetype: 'image/jpeg' },
  '.jpeg': { type: 'image', mimetype: 'image/jpeg' },
  '.png': { type: 'image', mimetype: 'image/png' },
  '.webp': { type: 'image', mimetype: 'image/webp' },
};

let nextDownloadAllowedAt = 0;
let downloadSequence = Promise.resolve();

export function randomDownloadDelayMs(
  minSeconds: number,
  maxSeconds: number,
  random: () => number = Math.random
): number {
  const lower = Math.min(minSeconds, maxSeconds);
  const upper = Math.max(minSeconds, maxSeconds);
  const ratio = Math.min(1, Math.max(0, random()));
  return Math.round((lower + ratio * (upper - lower)) * 1000);
}

async function waitForDownloadPacing(): Promise<void> {
  const remainingMs = nextDownloadAllowedAt - Date.now();
  if (remainingMs > 0) await sleep(remainingMs);
}

function scheduleNextDownload(): void {
  nextDownloadAllowedAt = Date.now() + randomDownloadDelayMs(
    config.download.delayMinSeconds,
    config.download.delayMaxSeconds
  );
}

export function isPlatformUrl(platform: DownloadPlatform, input: string): boolean {
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) {
      return false;
    }

    const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
    return PLATFORM_HOSTS[platform].some(
      (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
    );
  } catch {
    return false;
  }
}

export function isAllowedSocialKitDownloadUrl(input: string): boolean {
  try {
    const url = new URL(input);
    return url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      SOCIALKIT_DOWNLOAD_HOST.test(url.hostname);
  } catch {
    return false;
  }
}

export function isAllowedTikWmMediaUrl(input: string): boolean {
  try {
    const url = new URL(input);
    const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
    return url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      TIKWM_MEDIA_ROOT_HOSTS.some(
        (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
      );
  } catch {
    return false;
  }
}

export function parseSocialDownloadRequest(
  platform: DownloadPlatform,
  args: string[]
): SocialDownloadRequest {
  const values = [...args];
  const option = values[0]?.toLowerCase();
  let mode: DownloadMode = 'video';

  if (['audio', 'mp3', 'lagu'].includes(option)) {
    mode = 'audio';
    values.shift();
  } else if (['video', 'hd'].includes(option)) {
    values.shift();
  }

  if (values.length !== 1 || !isPlatformUrl(platform, values[0])) {
    throw new SocialDownloadError('INVALID_URL', 'Link tidak sah atau tidak sepadan dengan command.');
  }

  return { platform, mode, url: values[0] };
}

function runYtDlp(args: string[], signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      config.download.ytDlpPath,
      args,
      {
        windowsHide: true,
        timeout: config.download.timeoutMs,
        signal,
        maxBuffer: 2 * 1024 * 1024,
      },
      (error, _stdout, stderr) => {
        if (!error) {
          resolve();
          return;
        }

        const code = String((error as NodeJS.ErrnoException).code || 'DOWNLOAD_FAILED');
        const detail = stderr.toLowerCase();

        if (code === 'ENOENT') {
          reject(new SocialDownloadError('YT_DLP_MISSING', 'yt-dlp belum dipasang pada komputer Mizuki.'));
        } else if (error.name === 'AbortError' || (error as any).killed || /timed?\s*out/.test(detail)) {
          reject(new SocialDownloadError('DOWNLOAD_TIMEOUT', 'Download mengambil masa terlalu lama.'));
        } else if (/larger than max-filesize|maximum file size/.test(detail)) {
          reject(new SocialDownloadError('FILE_TOO_LARGE', `Media melebihi ${config.download.maxSizeMB}MB.`));
        } else if (/does not pass filter|duration/.test(detail)) {
          reject(new SocialDownloadError('DURATION_LIMIT', `Media melebihi ${Math.floor(config.download.maxDurationSeconds / 60)} minit.`));
        } else if (/login required|sign in|private|cookies/.test(detail)) {
          reject(new SocialDownloadError('LOGIN_REQUIRED', 'Media private atau memerlukan login dan tidak boleh dimuat turun.'));
        } else if (/http error 403|forbidden/.test(detail)) {
          reject(new SocialDownloadError('PLATFORM_BLOCKED', 'Platform menolak download (403). Cuba semula atau gunakan link awam lain.'));
        } else if (/unsupported url|video unavailable|no video formats|not available/.test(detail)) {
          reject(new SocialDownloadError('UNAVAILABLE', 'Media tidak tersedia atau link tidak disokong.'));
        } else if (/unexpected response|unable to download webpage/.test(detail)) {
          reject(new SocialDownloadError('PLATFORM_CHANGED', 'Platform sedang menolak extractor. Cuba semula selepas kemas kini downloader.'));
        } else {
          reject(new SocialDownloadError('DOWNLOAD_FAILED', 'Media gagal dimuat turun. Cuba link lain atau kemas kini yt-dlp.'));
        }
      }
    );
  });
}

function runGalleryDl(args: string[], signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      config.download.galleryDlPath,
      args,
      {
        windowsHide: true,
        timeout: config.download.timeoutMs,
        signal,
        maxBuffer: 2 * 1024 * 1024,
      },
      (error, _stdout, stderr) => {
        if (!error) {
          resolve(stderr);
          return;
        }

        const code = String((error as NodeJS.ErrnoException).code || 'GALLERY_FAILED');
        const detail = stderr.toLowerCase();
        if (code === 'ENOENT') {
          reject(new SocialDownloadError('GALLERY_DL_MISSING', 'gallery-dl belum dipasang pada komputer Mizuki.'));
        } else if (/permission denied|database is locked|could not copy/.test(detail)) {
          reject(new SocialDownloadError(
            'BROWSER_COOKIES_LOCKED',
            'Cookies browser sedang dikunci. Tutup Opera/Chrome sepenuhnya, kemudian cuba semula.'
          ));
        } else if (/unable to find .*cookies database/.test(detail)) {
          reject(new SocialDownloadError(
            'BROWSER_COOKIES_NOT_FOUND',
            'Database cookies browser tidak ditemui. Semak GALLERY_DL_COOKIES_BROWSER dalam .env.'
          ));
        } else if (error.name === 'AbortError' || (error as any).killed || /timed?\s*out/.test(detail)) {
          reject(new SocialDownloadError('DOWNLOAD_TIMEOUT', 'Download mengambil masa terlalu lama.'));
        } else if (/filesize|too large|larger than/.test(detail)) {
          reject(new SocialDownloadError('FILE_TOO_LARGE', `Media melebihi ${config.download.maxSizeMB}MB.`));
        } else if (/login|auth|cookie|401|403|forbidden/.test(detail)) {
          reject(new SocialDownloadError(
            'GALLERY_LOGIN_REQUIRED',
            'Post TikTok/Instagram/X memerlukan sesi browser. Tetapkan GALLERY_DL_COOKIES_BROWSER dalam .env.'
          ));
        } else {
          reject(new SocialDownloadError('GALLERY_FAILED', 'Gambar/video post gagal diekstrak.'));
        }
      }
    );
  });
}

function hasTikTokApiFallback(): boolean {
  return Boolean(config.download.socialKitApiKey) || config.download.tikWmEnabled;
}

function shouldUseTikTokApiFallback(err: unknown): boolean {
  return hasTikTokApiFallback() &&
    err instanceof SocialDownloadError &&
    LOCAL_FALLBACK_CODES.has(err.code);
}

function canonicalTikTokUrl(input: string): string {
  const url = new URL(input);
  url.search = '';
  url.hash = '';
  return url.toString();
}

export function classifySocialKitFailure(status: number, detail = ''): SocialDownloadError {
  const normalizedDetail = detail.toLowerCase();
  if (status === 429 || /rate limit|retry in/.test(normalizedDetail)) {
    return new SocialDownloadError(
      'SOCIALKIT_RATE_LIMIT',
      'TikTok API sedang sibuk. Cuba semula sebentar lagi.'
    );
  }
  if (status === 402 || /credit|quota|request limit.*month|monthly.*limit/.test(normalizedDetail)) {
    return new SocialDownloadError(
      'SOCIALKIT_QUOTA',
      'Kredit percuma TikTok API sudah habis.'
    );
  }
  if ([401, 403].includes(status) || /access key/.test(normalizedDetail)) {
    return new SocialDownloadError(
      'SOCIALKIT_KEY_INVALID',
      'Fallback TikTok belum aktif. Semak SOCIALKIT_API_KEY dalam .env.'
    );
  }
  return new SocialDownloadError(
    'SOCIALKIT_FAILED',
    'TikTok API juga tidak dapat memproses link ini.'
  );
}

async function readResponseWithLimit(
  response: Response,
  maxBytes: number,
  tooLargeError: () => SocialDownloadError = () =>
    new SocialDownloadError('FILE_TOO_LARGE', `Media melebihi ${config.download.maxSizeMB}MB.`),
  missingBodyError: () => SocialDownloadError = () =>
    new SocialDownloadError('DOWNLOAD_FAILED', 'Provider tidak menghantar respons.')
): Promise<Buffer> {
  const declaredSize = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredSize) && declaredSize > maxBytes) {
    await response.body?.cancel();
    throw tooLargeError();
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw missingBodyError();
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw tooLargeError();
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks, totalBytes);
}

function canTryNextTikTokApi(err: unknown): boolean {
  return err instanceof SocialDownloadError &&
    !['FILE_TOO_LARGE', 'DURATION_LIMIT', 'INVALID_URL'].includes(err.code);
}

function tikWmMediaType(
  kind: DownloadedMediaType,
  contentType: string
): Omit<DownloadedSocialMedia, 'buffer'> | null {
  if (kind === 'video') {
    return contentType.startsWith('video/') || contentType === 'application/octet-stream'
      ? { type: 'video', mimetype: 'video/mp4' }
      : null;
  }
  if (kind === 'audio') {
    if (contentType.startsWith('audio/mpeg')) return { type: 'audio', mimetype: 'audio/mpeg' };
    return contentType.startsWith('audio/') || contentType === 'application/octet-stream'
      ? { type: 'audio', mimetype: 'audio/mp4' }
      : null;
  }
  if (contentType.startsWith('image/png')) return { type: 'image', mimetype: 'image/png' };
  if (contentType.startsWith('image/webp')) return { type: 'image', mimetype: 'image/webp' };
  return contentType.startsWith('image/') ? { type: 'image', mimetype: 'image/jpeg' } : null;
}

async function downloadTikWmMedia(
  mediaUrl: string,
  kind: DownloadedMediaType,
  signal: AbortSignal,
  maxBytes = config.download.maxSizeMB * 1024 * 1024,
  tooLargeError: () => SocialDownloadError = () =>
    new SocialDownloadError('FILE_TOO_LARGE', `Media melebihi ${config.download.maxSizeMB}MB.`)
): Promise<DownloadedSocialMedia> {
  if (!isAllowedTikWmMediaUrl(mediaUrl)) {
    throw new SocialDownloadError('TIKWM_INVALID_URL', 'API kedua memberi URL media yang tidak sah.');
  }

  const response = await fetch(mediaUrl, {
    redirect: 'error',
    signal,
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new SocialDownloadError('TIKWM_MEDIA_FAILED', 'Fail daripada API kedua gagal dimuat turun.');
  }

  const outputType = tikWmMediaType(
    kind,
    response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() || ''
  );
  if (!outputType) {
    await response.body?.cancel();
    throw new SocialDownloadError('TIKWM_INVALID_MEDIA', 'API kedua menghantar jenis fail yang tidak sah.');
  }

  const buffer = await readResponseWithLimit(response, maxBytes, tooLargeError);
  if (buffer.length === 0) {
    throw new SocialDownloadError('TIKWM_INVALID_MEDIA', 'API kedua menghantar fail kosong.');
  }
  return { ...outputType, buffer };
}

async function downloadWithTikWm(
  request: SocialDownloadRequest,
  signal: AbortSignal
): Promise<DownloadedSocialMedia[]> {
  try {
    const operationSignal = AbortSignal.any([
      signal,
      AbortSignal.timeout(Math.min(config.download.timeoutMs, 60000)),
    ]);
    const apiUrl = new URL(TIKWM_API_URL);
    apiUrl.searchParams.set('url', canonicalTikTokUrl(request.url));
    apiUrl.searchParams.set('hd', '1');

    const response = await fetch(apiUrl, {
      redirect: 'error',
      signal: operationSignal,
    });
    const body = await readResponseWithLimit(
      response,
      256 * 1024,
      () => new SocialDownloadError('TIKWM_FAILED', 'Respons API kedua terlalu besar.'),
      () => new SocialDownloadError('TIKWM_FAILED', 'API kedua tidak menghantar respons.')
    );

    let payload: TikWmResponse;
    try {
      payload = JSON.parse(body.toString('utf8')) as TikWmResponse;
    } catch {
      throw new SocialDownloadError('TIKWM_FAILED', 'Respons API kedua tidak sah.');
    }
    if (!response.ok || payload.code !== 0 || !payload.data) {
      const isRateLimited = response.status === 429 || /rate limit|too many/i.test(payload.msg || '');
      throw new SocialDownloadError(
        isRateLimited ? 'TIKWM_RATE_LIMIT' : 'TIKWM_FAILED',
        isRateLimited
          ? 'API TikTok percuma sedang sibuk. Cuba semula sebentar lagi.'
          : 'Kedua-dua API TikTok gagal memproses link ini.'
      );
    }

    const duration = Number(payload.data.duration);
    if (Number.isFinite(duration) && duration > config.download.maxDurationSeconds) {
      throw new SocialDownloadError(
        'DURATION_LIMIT',
        `Media melebihi ${Math.floor(config.download.maxDurationSeconds / 60)} minit.`
      );
    }

    let results: DownloadedSocialMedia[];
    if (request.mode === 'audio') {
      const audioUrl = [payload.data.music_info?.play, payload.data.music]
        .find((value): value is string => typeof value === 'string' && value.length > 0);
      if (!audioUrl) throw new SocialDownloadError('TIKWM_NO_OUTPUT', 'API kedua tidak menemui audio.');
      results = [await downloadTikWmMedia(audioUrl, 'audio', operationSignal)];
    } else if (Array.isArray(payload.data.images) && payload.data.images.length) {
      results = [];
      let totalBytes = 0;
      const totalLimit = config.download.maxTotalSizeMB * 1024 * 1024;
      const imageUrls = payload.data.images
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
        .slice(0, config.download.maxItems);
      if (imageUrls.length === 0) {
        throw new SocialDownloadError('TIKWM_NO_OUTPUT', 'API kedua tidak menemui gambar.');
      }
      for (const imageUrl of imageUrls) {
        const remainingBytes = totalLimit - totalBytes;
        if (remainingBytes <= 0) {
          throw new SocialDownloadError(
            'FILE_TOO_LARGE',
            `Jumlah media melebihi ${config.download.maxTotalSizeMB}MB.`
          );
        }
        const perFileLimit = config.download.maxSizeMB * 1024 * 1024;
        const usesTotalLimit = remainingBytes < perFileLimit;
        const image = await downloadTikWmMedia(
          imageUrl,
          'image',
          operationSignal,
          Math.min(perFileLimit, remainingBytes),
          usesTotalLimit
            ? () => new SocialDownloadError(
              'FILE_TOO_LARGE',
              `Jumlah media melebihi ${config.download.maxTotalSizeMB}MB.`
            )
            : undefined
        );
        totalBytes += image.buffer.length;
        if (totalBytes > config.download.maxTotalSizeMB * 1024 * 1024) {
          throw new SocialDownloadError(
            'FILE_TOO_LARGE',
            `Jumlah media melebihi ${config.download.maxTotalSizeMB}MB.`
          );
        }
        results.push(image);
      }
    } else {
      const videoUrls = [...new Set(
        [payload.data.hdplay, payload.data.play]
          .filter((value): value is string => typeof value === 'string' && value.length > 0)
      )];
      let lastError: unknown;
      let video: DownloadedSocialMedia | undefined;
      for (const videoUrl of videoUrls) {
        try {
          video = await downloadTikWmMedia(videoUrl, 'video', operationSignal);
          break;
        } catch (err) {
          if (operationSignal.aborted) throw err;
          lastError = err;
        }
      }
      if (!video) {
        if (lastError instanceof Error) throw lastError;
        throw new SocialDownloadError('TIKWM_NO_OUTPUT', 'API kedua tidak menemui video.');
      }
      results = [video];
    }

    const totalBytes = results.reduce((total, item) => total + item.buffer.length, 0);
    if (totalBytes > config.download.maxTotalSizeMB * 1024 * 1024) {
      throw new SocialDownloadError('FILE_TOO_LARGE', `Jumlah media melebihi ${config.download.maxTotalSizeMB}MB.`);
    }
    return results;
  } catch (err) {
    if (err instanceof SocialDownloadError) throw err;
    if (err instanceof Error && ['AbortError', 'TimeoutError'].includes(err.name)) {
      throw new SocialDownloadError('TIKWM_TIMEOUT', 'API TikTok percuma mengambil masa terlalu lama.');
    }
    throw new SocialDownloadError('TIKWM_FAILED', 'API TikTok percuma tidak dapat dihubungi.');
  }
}

async function downloadWithSocialKit(
  request: SocialDownloadRequest,
  signal: AbortSignal
): Promise<DownloadedSocialMedia[]> {
  try {
    const format = request.mode === 'audio' ? 'mp3' : 'mp4';
    const apiResponse = await fetch(SOCIALKIT_API_URL, {
      method: 'POST',
      redirect: 'error',
      headers: {
        'content-type': 'application/json',
        'x-access-key': config.download.socialKitApiKey,
      },
      body: JSON.stringify({
        url: canonicalTikTokUrl(request.url),
        format,
        ...(request.mode === 'video' ? { quality: '720p' } : {}),
      }),
      signal,
    });

    let payload: SocialKitResponse;
    try {
      const responseBody = await readResponseWithLimit(
        apiResponse,
        64 * 1024,
        () => new SocialDownloadError('SOCIALKIT_FAILED', 'Respons TikTok API terlalu besar.')
      );
      payload = JSON.parse(responseBody.toString('utf8')) as SocialKitResponse;
    } catch (err) {
      if (err instanceof SocialDownloadError) throw err;
      if (err instanceof Error && ['AbortError', 'TimeoutError'].includes(err.name)) throw err;
      throw classifySocialKitFailure(apiResponse.status);
    }

    if (!apiResponse.ok || !payload.success) {
      throw classifySocialKitFailure(
        apiResponse.status,
        String(payload.error || payload.message || '')
      );
    }

    const downloadUrl = payload.data?.downloadUrl;
    if (!downloadUrl || !isAllowedSocialKitDownloadUrl(downloadUrl)) {
      throw new SocialDownloadError('SOCIALKIT_INVALID_URL', 'TikTok API memberi URL media yang tidak sah.');
    }

    const maxBytes = config.download.maxSizeMB * 1024 * 1024;
    const declaredSize = Number(payload.data?.fileSize);
    if (Number.isFinite(declaredSize) && declaredSize > maxBytes) {
      throw new SocialDownloadError('FILE_TOO_LARGE', `Media melebihi ${config.download.maxSizeMB}MB.`);
    }
    const duration = Number(payload.data?.durationSeconds);
    if (Number.isFinite(duration) && duration > config.download.maxDurationSeconds) {
      throw new SocialDownloadError(
        'DURATION_LIMIT',
        `Media melebihi ${Math.floor(config.download.maxDurationSeconds / 60)} minit.`
      );
    }

    const mediaResponse = await fetch(downloadUrl, {
      redirect: 'error',
      signal,
    });
    if (!mediaResponse.ok) {
      await mediaResponse.body?.cancel();
      throw new SocialDownloadError('SOCIALKIT_MEDIA_FAILED', 'Fail TikTok API gagal dimuat turun.');
    }
    const contentType = mediaResponse.headers.get('content-type')?.toLowerCase() || '';
    if (contentType.startsWith('text/') || contentType.includes('application/json')) {
      await mediaResponse.body?.cancel();
      throw new SocialDownloadError('SOCIALKIT_INVALID_MEDIA', 'TikTok API tidak menghantar fail media.');
    }

    const buffer = await readResponseWithLimit(mediaResponse, maxBytes);
    if (buffer.length === 0) {
      throw new SocialDownloadError('SOCIALKIT_INVALID_MEDIA', 'TikTok API menghantar fail kosong.');
    }
    return [{
      buffer,
      type: request.mode === 'audio' ? 'audio' : 'video',
      mimetype: request.mode === 'audio' ? 'audio/mpeg' : 'video/mp4',
    }];
  } catch (err) {
    if (err instanceof SocialDownloadError) throw err;
    if (err instanceof Error && ['AbortError', 'TimeoutError'].includes(err.name)) {
      throw new SocialDownloadError('SOCIALKIT_TIMEOUT', 'TikTok API mengambil masa terlalu lama.');
    }
    throw new SocialDownloadError('SOCIALKIT_FAILED', 'TikTok API tidak dapat dihubungi.');
  }
}

async function downloadWithTikTokApis(
  request: SocialDownloadRequest,
  originalError: unknown,
  signal: AbortSignal
): Promise<DownloadedSocialMedia[]> {
  let lastError = originalError;

  if (config.download.socialKitApiKey) {
    try {
      return await downloadWithSocialKit(request, signal);
    } catch (err) {
      lastError = err;
      if (!canTryNextTikTokApi(err)) throw err;
    }
  }

  if (config.download.tikWmEnabled) {
    return downloadWithTikWm(request, signal);
  }

  if (lastError instanceof Error) throw lastError;
  throw new SocialDownloadError('DOWNLOAD_FAILED', 'Media TikTok gagal dimuat turun.');
}

async function loadOutputFiles(tempDir: string): Promise<DownloadedSocialMedia[]> {
  const entries = (await fs.readdir(tempDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && OUTPUT_TYPES[path.extname(entry.name).toLowerCase()])
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    .slice(0, config.download.maxItems);

  if (entries.length === 0) {
    throw new SocialDownloadError('NO_OUTPUT', 'Downloader tidak menghasilkan fail media.');
  }

  const files = await Promise.all(entries.map(async (entry) => {
    const filePath = path.join(tempDir, entry.name);
    return { entry, filePath, stat: await fs.stat(filePath) };
  }));
  const maxBytes = config.download.maxSizeMB * 1024 * 1024;
  if (files.some((file) => file.stat.size > maxBytes)) {
    throw new SocialDownloadError('FILE_TOO_LARGE', `Satu media melebihi ${config.download.maxSizeMB}MB.`);
  }
  const totalBytes = files.reduce((total, file) => total + file.stat.size, 0);
  if (totalBytes > config.download.maxTotalSizeMB * 1024 * 1024) {
    throw new SocialDownloadError('FILE_TOO_LARGE', `Jumlah media melebihi ${config.download.maxTotalSizeMB}MB.`);
  }

  return Promise.all(files.map(async ({ entry, filePath }) => ({
    ...OUTPUT_TYPES[path.extname(entry.name).toLowerCase()],
    buffer: await fs.readFile(filePath),
  })));
}

async function downloadWithYtDlp(
  request: SocialDownloadRequest,
  signal: AbortSignal
): Promise<DownloadedSocialMedia[]> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mizuki-social-'));
  const multiple = request.mode === 'video' && ['tt', 'ig', 'x'].includes(request.platform);
  const outputTemplate = path.join(
    tempDir,
    multiple ? 'media-%(playlist_index|1)s.%(ext)s' : 'media.%(ext)s'
  );
  const maxSize = `${config.download.maxSizeMB}M`;
  const retries = request.platform === 'tt' && hasTikTokApiFallback() ? '0' : '2';

  const args = [
    '--no-config',
    ...(multiple ? [] : ['--no-playlist']),
    '--playlist-end', String(multiple ? config.download.maxItems : 1),
    '--no-progress',
    '--no-warnings',
    '--restrict-filenames',
    '--socket-timeout', '20',
    '--sleep-requests', '0.75',
    '--retries', retries,
    '--fragment-retries', retries,
    ...(retries === '0' ? ['--extractor-retries', '0'] : []),
    '--retry-sleep', 'http:3',
    '--retry-sleep', 'fragment:3',
    '--max-filesize', maxSize,
    '--match-filters', `!is_live & duration <=? ${config.download.maxDurationSeconds}`,
    '--output', outputTemplate,
  ];

  if (request.mode === 'audio') {
    args.push('--extract-audio', '--audio-format', 'mp3', '--audio-quality', '0');
  } else {
    args.push(
      '--format',
      'bv*[height<=720]+ba/b[height<=720]/bv*+ba/b',
      '--merge-output-format', 'mkv',
      '--recode-video', 'mp4'
    );
  }
  args.push('--', request.url);

  try {
    await runYtDlp(args, signal);
    return await loadOutputFiles(tempDir);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
}

async function downloadWithGalleryDl(
  request: SocialDownloadRequest,
  signal: AbortSignal
): Promise<DownloadedSocialMedia[]> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mizuki-gallery-'));
  const args = [
    '--config-ignore',
    '--no-input',
    '--no-colors',
    '--directory', tempDir,
    '--filename', '{num}.{extension}',
    '--range', `1-${config.download.maxItems}`,
    '--filesize-max', `${config.download.maxSizeMB}M`,
    '--http-timeout', '30',
    '--retries', request.platform === 'tt' && hasTikTokApiFallback() ? '0' : '2',
    '--sleep-request', '0.75',
    '--sleep-retries', '3-8',
  ];
  if (config.download.galleryDlCookiesBrowser) {
    args.push('--cookies-from-browser', config.download.galleryDlCookiesBrowser);
  }
  if (request.platform === 'tt' && request.mode === 'video') {
    args.push('--option', 'extractor.tiktok.audio=false');
  }
  args.push('--', request.url);

  try {
    await runGalleryDl(args, signal);
    try {
      return await loadOutputFiles(tempDir);
    } catch (err) {
      if (err instanceof SocialDownloadError && err.code === 'NO_OUTPUT') {
        throw new SocialDownloadError(
          'GALLERY_LOGIN_REQUIRED',
          'Post tidak menghasilkan media. Semak link awam atau tetapkan GALLERY_DL_COOKIES_BROWSER dalam .env jika login diperlukan.'
        );
      }
      throw err;
    }
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
}

/** Downloads a public post as one or more WhatsApp media items. */
async function downloadSocialMediaNow(
  request: SocialDownloadRequest,
  signal: AbortSignal
): Promise<DownloadedSocialMedia[]> {
  const tiktokPhotoPost = request.platform === 'tt' &&
    new URL(request.url).pathname.toLowerCase().includes('/photo/');

  if (request.mode === 'video' && (['ig', 'x'].includes(request.platform) || tiktokPhotoPost)) {
    let galleryError: unknown;
    try {
      return await downloadWithGalleryDl(request, signal);
    } catch (err) {
      galleryError = err;
    }

    try {
      return await downloadWithYtDlp(request, signal);
    } catch (err) {
      if (request.platform === 'tt' &&
          (shouldUseTikTokApiFallback(galleryError) || shouldUseTikTokApiFallback(err))) {
        return downloadWithTikTokApis(request, err, signal);
      }
      if (
        galleryError instanceof SocialDownloadError &&
        err instanceof SocialDownloadError &&
        ['UNAVAILABLE', 'LOGIN_REQUIRED', 'NO_OUTPUT', 'DOWNLOAD_FAILED', 'FORMAT_UNAVAILABLE'].includes(err.code)
      ) {
        throw galleryError;
      }
      throw err;
    }
  }

  if (request.mode === 'video' && request.platform === 'tt') {
    try {
      return await downloadWithYtDlp(request, signal);
    } catch (ytDlpError) {
      try {
        return await downloadWithGalleryDl(request, signal);
      } catch (galleryError) {
        if (shouldUseTikTokApiFallback(ytDlpError) || shouldUseTikTokApiFallback(galleryError)) {
          return downloadWithTikTokApis(request, galleryError, signal);
        }
        if (
          ytDlpError instanceof SocialDownloadError &&
          galleryError instanceof SocialDownloadError &&
          ['UNAVAILABLE', 'LOGIN_REQUIRED', 'NO_OUTPUT', 'DOWNLOAD_FAILED'].includes(ytDlpError.code)
        ) {
          throw galleryError;
        }
        throw ytDlpError;
      }
    }
  }

  try {
    return await downloadWithYtDlp(request, signal);
  } catch (err) {
    if (request.platform === 'tt' && shouldUseTikTokApiFallback(err)) {
      return downloadWithTikTokApis(request, err, signal);
    }
    throw err;
  }
}

/** Serializes and spaces jobs even when the outer media queue is disabled. */
export async function downloadSocialMedia(
  request: SocialDownloadRequest
): Promise<DownloadedSocialMedia[]> {
  const previousDownload = downloadSequence;
  let releaseDownload!: () => void;
  downloadSequence = new Promise<void>((resolve) => {
    releaseDownload = resolve;
  });

  await previousDownload;
  try {
    await waitForDownloadPacing();
    const signal = AbortSignal.timeout(config.download.timeoutMs);
    return await downloadSocialMediaNow(request, signal);
  } finally {
    scheduleNextDownload();
    releaseDownload();
  }
}
