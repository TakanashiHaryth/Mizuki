import { createSocialDownloadHandler } from './socialDownload';

/** Downloads a public X/Twitter video or its audio track. */
export const xDownloadHandler = createSocialDownloadHandler('x', 'X');
