import { config } from '../config';

export class MediaQueueFullError extends Error {
  constructor() {
    super('Media processing queue is full');
    this.name = 'MediaQueueFullError';
  }
}

/** Small in-process semaphore that limits concurrent ffmpeg/sharp jobs. */
export class MediaJobQueue {
  private activeJobs = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(
    private readonly maxConcurrent: number,
    private readonly maxQueued: number
  ) {
    if (maxConcurrent < 1 || maxQueued < 0) {
      throw new Error('Invalid media queue limits');
    }
  }

  run<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const start = () => {
        this.activeJobs += 1;
        task()
          .then(resolve, reject)
          .finally(() => {
            this.activeJobs -= 1;
            this.waiting.shift()?.();
          });
      };

      if (this.activeJobs < this.maxConcurrent) {
        start();
        return;
      }

      if (this.waiting.length >= this.maxQueued) {
        reject(new MediaQueueFullError());
        return;
      }

      this.waiting.push(start);
    });
  }

  get active(): number {
    return this.activeJobs;
  }

  get queued(): number {
    return this.waiting.length;
  }
}

export const mediaQueue = new MediaJobQueue(
  config.media.maxConcurrentJobs,
  config.media.maxQueuedJobs
);
