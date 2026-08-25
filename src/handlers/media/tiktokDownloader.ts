import { createSocialDownloadHandler } from './socialDownload';

/** Downloads a public TikTok video or its audio track. */
export const tiktokDownloadHandler = createSocialDownloadHandler('tt', 'TikTok');
