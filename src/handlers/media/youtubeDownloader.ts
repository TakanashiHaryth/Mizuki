import { createSocialDownloadHandler } from './socialDownload';

/** Downloads a public YouTube video or its audio track. */
export const youtubeDownloadHandler = createSocialDownloadHandler('yt', 'YouTube');
