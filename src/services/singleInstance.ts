import fs from 'fs';
import path from 'path';

const DEFAULT_LOCK_PATH = path.resolve(process.cwd(), '.mizuki.lock');

function processIsRunning(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;

  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // EPERM means the process exists but cannot be signalled by this user.
    return (err as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/** Prevents two Mizuki processes from sharing the same WhatsApp auth state. */
export class SingleInstanceLock {
  private held = false;

  constructor(private readonly lockPath = DEFAULT_LOCK_PATH) {}

  acquire(): void {
    if (this.held) return;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const fd = fs.openSync(this.lockPath, 'wx');
        try {
          fs.writeFileSync(fd, String(process.pid), 'utf8');
        } finally {
          fs.closeSync(fd);
        }
        this.held = true;
        return;
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code !== 'EEXIST') throw err;

        let existingPid = 0;
        try {
          existingPid = Number.parseInt(fs.readFileSync(this.lockPath, 'utf8').trim(), 10);
        } catch (readErr) {
          if ((readErr as NodeJS.ErrnoException).code === 'ENOENT') continue;
        }

        if (processIsRunning(existingPid)) {
          throw new Error(`Mizuki is already running (PID ${existingPid}). Stop it before starting another instance.`);
        }

        // The previous process crashed and left a stale lock behind.
        try {
          fs.unlinkSync(this.lockPath);
        } catch (unlinkErr) {
          if ((unlinkErr as NodeJS.ErrnoException).code !== 'ENOENT') throw unlinkErr;
        }
      }
    }

    throw new Error('Could not acquire the Mizuki single-instance lock.');
  }

  release(): void {
    if (!this.held) return;

    try {
      const ownerPid = Number.parseInt(fs.readFileSync(this.lockPath, 'utf8').trim(), 10);
      if (ownerPid === process.pid) fs.unlinkSync(this.lockPath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    } finally {
      this.held = false;
    }
  }
}

export const botInstanceLock = new SingleInstanceLock();
