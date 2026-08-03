import { spawn } from 'child_process';
import { createHash, randomBytes } from 'crypto';
import { createReadStream, createWriteStream, promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createGunzip, createGzip } from 'zlib';
import { config } from '../config';

const backupDir = path.resolve(process.cwd(), config.dbBackup.directory);

function output(message: string): void {
  process.stdout.write(`${message}\n`);
}

function optionValue(value: string): string {
  if (/\r|\n/.test(value)) throw new Error('MySQL credentials contain an invalid newline');
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

async function withCredentials<T>(task: (optionFile: string) => Promise<T>): Promise<T> {
  const optionFile = path.join(
    os.tmpdir(),
    `mizuki-mysql-${process.pid}-${randomBytes(6).toString('hex')}.cnf`
  );
  const contents = [
    '[client]',
    `host=${optionValue(config.db.host)}`,
    `port=${config.db.port}`,
    `user=${optionValue(config.db.user)}`,
    `password=${optionValue(config.db.password)}`,
    'default-character-set=utf8mb4',
    '',
  ].join('\n');

  await fs.writeFile(optionFile, contents, { encoding: 'utf8', mode: 0o600 });
  try {
    return await task(optionFile);
  } finally {
    await fs.rm(optionFile, { force: true });
  }
}

async function findBinary(name: 'mysql' | 'mysqldump' | 'mysqlcheck'): Promise<string> {
  const executable = process.platform === 'win32' ? `${name}.exe` : name;
  const candidates = [
    config.dbBackup.mysqlBinDir && path.join(config.dbBackup.mysqlBinDir, executable),
    process.env.XAMPP_ROOT && path.join(process.env.XAMPP_ROOT, 'mysql', 'bin', executable),
    process.platform === 'win32' && path.join('C:\\xampp\\mysql\\bin', executable),
    process.platform === 'win32' && path.join('D:\\xampp\\mysql\\bin', executable),
    process.platform === 'win32' && path.join('E:\\xampp\\mysql\\bin', executable),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next known XAMPP location.
    }
  }

  // Fall back to PATH on Linux/macOS or custom installations.
  return executable;
}

function waitForExit(
  child: ReturnType<typeof spawn>,
  label: string,
  stderr: { value: string }
): Promise<void> {
  child.stderr?.on('data', (chunk: Buffer) => {
    if (stderr.value.length < 64_000) stderr.value += chunk.toString('utf8');
  });

  return new Promise((resolve, reject) => {
    child.once('error', (err) => reject(new Error(`${label} tidak dapat dimulakan: ${err.message}`)));
    child.once('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} gagal (exit ${code}). ${stderr.value.trim()}`));
    });
  });
}

async function sha256(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  await pipeline(createReadStream(filePath), hash);
  return hash.digest('hex');
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function pruneExpiredBackups(): Promise<void> {
  const days = config.dbBackup.retentionDays;
  if (!Number.isInteger(days) || days < 1) return;

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const entries = await fs.readdir(backupDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.sql.gz')) continue;
    const filePath = path.join(backupDir, entry.name);
    const stat = await fs.stat(filePath);
    if (stat.mtimeMs >= cutoff) continue;
    await fs.rm(filePath, { force: true });
    await fs.rm(`${filePath}.sha256`, { force: true });
    output(`🧹 Backup lama dibuang: ${entry.name}`);
  }
}

async function createBackup(label = 'manual'): Promise<string> {
  await fs.mkdir(backupDir, { recursive: true });
  const dumpBinary = await findBinary('mysqldump');
  const safeDatabase = config.db.database.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeLabel = label.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${safeDatabase}-${safeLabel}-${timestamp()}.sql.gz`;
  const destination = path.join(backupDir, fileName);
  const partial = `${destination}.partial`;

  await withCredentials(async (optionFile) => {
    const stderr = { value: '' };
    const child = spawn(
      dumpBinary,
      [
        `--defaults-extra-file=${optionFile}`,
        '--single-transaction',
        '--quick',
        '--routines',
        '--triggers',
        '--events',
        '--hex-blob',
        '--add-drop-table',
        config.db.database,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }
    );

    try {
      await Promise.all([
        pipeline(child.stdout!, createGzip({ level: 9 }), createWriteStream(partial, { flags: 'wx' })),
        waitForExit(child, 'mysqldump', stderr),
      ]);
      await fs.rename(partial, destination);
    } catch (err) {
      await fs.rm(partial, { force: true });
      throw err;
    }
  });

  const checksum = await sha256(destination);
  await fs.writeFile(`${destination}.sha256`, `${checksum}  ${fileName}\n`, 'utf8');
  await pruneExpiredBackups();
  output(`✅ Backup berjaya: ${destination}`);
  output(`🔐 SHA-256: ${checksum}`);
  return destination;
}

async function verifyBackup(filePath: string): Promise<void> {
  const checksumPath = `${filePath}.sha256`;
  try {
    const expected = (await fs.readFile(checksumPath, 'utf8')).trim().split(/\s+/)[0];
    const actual = await sha256(filePath);
    if (expected !== actual) throw new Error('Checksum backup tidak sepadan; fail mungkin rosak');
    output('✅ Checksum backup sah.');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      output('⚠️ Fail checksum tiada; restore diteruskan tanpa verifikasi integriti.');
      return;
    }
    throw err;
  }
}

async function latestBackup(): Promise<string> {
  await fs.mkdir(backupDir, { recursive: true });
  const entries = await fs.readdir(backupDir, { withFileTypes: true });
  const candidates = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && /\.sql(\.gz)?$/.test(entry.name))
      .map(async (entry) => {
        const filePath = path.join(backupDir, entry.name);
        return { filePath, modified: (await fs.stat(filePath)).mtimeMs };
      })
  );
  candidates.sort((a, b) => b.modified - a.modified);
  if (!candidates[0]) throw new Error(`Tiada backup ditemui dalam ${backupDir}`);
  return candidates[0].filePath;
}

async function verifyBackupCommand(args: string[]): Promise<void> {
  const fileArg = args.find((arg) => !arg.startsWith('--')) || 'latest';
  const filePath = fileArg.toLowerCase() === 'latest'
    ? await latestBackup()
    : path.resolve(process.cwd(), fileArg);
  const stat = await fs.stat(filePath);
  if (!stat.isFile()) throw new Error('Fail backup tidak sah');
  await verifyBackup(filePath);
  output(`✅ Backup boleh dibaca: ${filePath}`);
}

async function restoreBackup(args: string[]): Promise<void> {
  const fileArg = args.find((arg) => !arg.startsWith('--'));
  if (!fileArg) {
    throw new Error('Nyatakan fail atau latest: npm run db:restore -- latest --yes');
  }
  if (!args.includes('--yes')) {
    throw new Error('Restore boleh menggantikan data. Jalankan semula dengan --yes selepas menyemak nama database.');
  }

  const filePath = fileArg.toLowerCase() === 'latest'
    ? await latestBackup()
    : path.resolve(process.cwd(), fileArg);
  const stat = await fs.stat(filePath);
  if (!stat.isFile() || (!filePath.endsWith('.sql') && !filePath.endsWith('.sql.gz'))) {
    throw new Error('Backup mesti berupa fail .sql atau .sql.gz');
  }

  await verifyBackup(filePath);
  if (!args.includes('--skip-backup')) {
    output('📦 Membuat backup keselamatan sebelum restore...');
    await createBackup('pre-restore');
  }

  const mysqlBinary = await findBinary('mysql');
  await withCredentials(async (optionFile) => {
    const stderr = { value: '' };
    const child = spawn(
      mysqlBinary,
      [`--defaults-extra-file=${optionFile}`, '--binary-mode', `--database=${config.db.database}`],
      { stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true }
    );
    const source = createReadStream(filePath);
    const input = filePath.endsWith('.gz') ? source.pipe(createGunzip()) : source;
    await Promise.all([
      pipeline(input, child.stdin!),
      waitForExit(child, 'mysql restore', stderr),
    ]);
  });

  output(`✅ Restore berjaya ke database "${config.db.database}".`);
  output('ℹ️ Jalankan npm run db:check untuk semakan selepas restore.');
}

async function checkDatabase(): Promise<void> {
  const checkBinary = await findBinary('mysqlcheck');
  await withCredentials(async (optionFile) => {
    const stderr = { value: '' };
    const child = spawn(
      checkBinary,
      [`--defaults-extra-file=${optionFile}`, '--check', '--databases', config.db.database],
      { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }
    );
    child.stdout?.pipe(process.stdout);
    await waitForExit(child, 'mysqlcheck', stderr);
  });
  output('✅ Semakan database selesai tanpa ralat.');
}

async function listBackups(): Promise<void> {
  await fs.mkdir(backupDir, { recursive: true });
  const entries = await fs.readdir(backupDir, { withFileTypes: true });
  const backups = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && /\.sql(\.gz)?$/.test(entry.name))
      .map(async (entry) => ({
        name: entry.name,
        stat: await fs.stat(path.join(backupDir, entry.name)),
      }))
  );
  backups.sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);

  if (backups.length === 0) {
    output(`Tiada backup dalam ${backupDir}`);
    return;
  }
  output(`Backup untuk database "${config.db.database}":`);
  for (const backup of backups) {
    const sizeMB = (backup.stat.size / 1024 / 1024).toFixed(2);
    output(`- ${backup.name} (${sizeMB} MB, ${backup.stat.mtime.toLocaleString()})`);
  }
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  switch (command) {
    case 'backup':
      await createBackup();
      break;
    case 'restore':
      await restoreBackup(args);
      break;
    case 'check':
      await checkDatabase();
      break;
    case 'verify':
      await verifyBackupCommand(args);
      break;
    case 'list':
      await listBackups();
      break;
    default:
      output('Penggunaan: database <backup|restore|check|list|verify>');
      process.exitCode = 1;
  }
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`❌ ${message}\n`);
  if (/Can't connect to MySQL|ECONNREFUSED|10061/i.test(message)) {
    process.stderr.write('💡 Buka XAMPP dan hidupkan MySQL, kemudian cuba semula.\n');
  } else if (/Access denied/i.test(message)) {
    process.stderr.write('💡 Semak DB_USER dan DB_PASSWORD dalam fail .env.\n');
  }
  process.exitCode = 1;
});
