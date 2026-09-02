import { spawn } from 'child_process';
import { createHash } from 'crypto';
import { createReadStream, createWriteStream, promises as fs } from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createGunzip, createGzip } from 'zlib';
import { QueryResultRow } from 'pg';
import { config } from '../config';
import { closePool, getPool, testConnection } from '../data/db';

const backupDir = path.resolve(process.cwd(), config.dbBackup.directory);
const expectedTables = [
  'users',
  'groups',
  'group_members',
  'admin_actions_log',
  'command_usage_log',
  'rate_limits',
  'user_rate_limits',
  'ai_memory',
  'media_jobs',
];

function output(message: string): void {
  process.stdout.write(`${message}\n`);
}

function postgresEnvironment(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  env.PGCONNECT_TIMEOUT ||= '10';

  if (config.db.connectionString) {
    delete env.PGHOST;
    delete env.PGPORT;
    delete env.PGUSER;
    delete env.PGPASSWORD;
    env.PGDATABASE = config.db.connectionString;
  } else {
    env.PGHOST = config.db.host;
    env.PGPORT = String(config.db.port);
    env.PGUSER = config.db.user;
    env.PGPASSWORD = config.db.password;
    env.PGDATABASE = config.db.database;
  }
  if (config.db.ssl) env.PGSSLMODE = config.db.sslRejectUnauthorized ? 'verify-full' : 'require';

  return env;
}

function databaseName(): string {
  if (!config.db.connectionString) return config.db.database;
  try {
    return decodeURIComponent(new URL(config.db.connectionString).pathname.slice(1)) || 'postgres';
  } catch {
    return 'postgres';
  }
}

async function findBinary(name: 'pg_dump' | 'psql'): Promise<string> {
  const executable = process.platform === 'win32' ? `${name}.exe` : name;
  const candidates = [
    config.dbBackup.postgresBinDir && path.join(config.dbBackup.postgresBinDir, executable),
    ...([19, 18, 17, 16, 15, 14].map((version) =>
      process.platform === 'win32'
        ? path.join(`C:\\Program Files\\PostgreSQL\\${version}\\bin`, executable)
        : ''
    )),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next known PostgreSQL installation directory.
    }
  }

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
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const entries = await fs.readdir(backupDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.pg.sql.gz')) continue;
    const filePath = path.join(backupDir, entry.name);
    if ((await fs.stat(filePath)).mtimeMs >= cutoff) continue;
    await fs.rm(filePath, { force: true });
    await fs.rm(`${filePath}.sha256`, { force: true });
    output(`🧹 Backup lama dibuang: ${entry.name}`);
  }
}

async function createBackup(label = 'manual'): Promise<string> {
  await fs.mkdir(backupDir, { recursive: true });
  const dumpBinary = await findBinary('pg_dump');
  const safeDatabase = databaseName().replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeLabel = label.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${safeDatabase}-${safeLabel}-${timestamp()}.pg.sql.gz`;
  const destination = path.join(backupDir, fileName);
  const partial = `${destination}.partial`;
  const stderr = { value: '' };
  const child = spawn(
    dumpBinary,
    [
      '--format=plain',
      '--clean',
      '--if-exists',
      '--no-owner',
      '--no-privileges',
      '--encoding=UTF8',
    ],
    {
      env: postgresEnvironment(),
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    }
  );

  try {
    await Promise.all([
      pipeline(child.stdout!, createGzip({ level: 9 }), createWriteStream(partial, { flags: 'wx' })),
      waitForExit(child, 'pg_dump', stderr),
    ]);
    await fs.rename(partial, destination);
  } catch (err) {
    await fs.rm(partial, { force: true });
    throw err;
  }

  const checksum = await sha256(destination);
  await fs.writeFile(`${destination}.sha256`, `${checksum}  ${fileName}\n`, 'utf8');
  await pruneExpiredBackups();
  output(`✅ Backup berjaya: ${destination}`);
  output(`🔐 SHA-256: ${checksum}`);
  return destination;
}

async function verifyBackup(filePath: string): Promise<void> {
  try {
    const expected = (await fs.readFile(`${filePath}.sha256`, 'utf8')).trim().split(/\s+/)[0];
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
      .filter((entry) => entry.isFile() && /\.pg\.sql(\.gz)?$/.test(entry.name))
      .map(async (entry) => {
        const filePath = path.join(backupDir, entry.name);
        return { filePath, modified: (await fs.stat(filePath)).mtimeMs };
      })
  );
  candidates.sort((a, b) => b.modified - a.modified);
  if (!candidates[0]) throw new Error(`Tiada backup ditemui dalam ${backupDir}`);
  return candidates[0].filePath;
}

async function backupFromArgs(args: string[]): Promise<string> {
  const fileArg = args.find((arg) => !arg.startsWith('--')) || 'latest';
  return fileArg.toLowerCase() === 'latest'
    ? latestBackup()
    : path.resolve(process.cwd(), fileArg);
}

async function verifyBackupCommand(args: string[]): Promise<void> {
  const filePath = await backupFromArgs(args);
  if (!(await fs.stat(filePath)).isFile()) throw new Error('Fail backup tidak sah');
  await verifyBackup(filePath);
  output(`✅ Backup boleh dibaca: ${filePath}`);
}

async function restoreBackup(args: string[]): Promise<void> {
  const fileArg = args.find((arg) => !arg.startsWith('--'));
  if (!fileArg) throw new Error('Nyatakan fail atau latest: npm run db:restore -- latest --yes');
  if (!args.includes('--yes')) {
    throw new Error('Restore boleh menggantikan data. Jalankan semula dengan --yes selepas menyemak nama database.');
  }

  const filePath = await backupFromArgs([fileArg]);
  const stat = await fs.stat(filePath);
  if (!stat.isFile() || (!filePath.endsWith('.pg.sql') && !filePath.endsWith('.pg.sql.gz'))) {
    throw new Error('Backup mesti berupa fail PostgreSQL .pg.sql atau .pg.sql.gz');
  }

  await verifyBackup(filePath);
  if (!args.includes('--skip-backup')) {
    output('📦 Membuat backup keselamatan sebelum restore...');
    await createBackup('pre-restore');
  }

  const psqlBinary = await findBinary('psql');
  const stderr = { value: '' };
  const child = spawn(
    psqlBinary,
    ['-X', '--set=ON_ERROR_STOP=on', '--single-transaction'],
    {
      env: postgresEnvironment(),
      stdio: ['pipe', 'ignore', 'pipe'],
      windowsHide: true,
    }
  );
  const source = createReadStream(filePath);
  const input = filePath.endsWith('.gz') ? source.pipe(createGunzip()) : source;
  await Promise.all([
    pipeline(input, child.stdin!),
    waitForExit(child, 'psql restore', stderr),
  ]);

  output(`✅ Restore berjaya ke database "${databaseName()}".`);
  output('ℹ️ Jalankan npm run db:check untuk semakan selepas restore.');
}

async function checkDatabase(): Promise<void> {
  try {
    await testConnection();
    const { rows } = await getPool().query<{ table_name: string } & QueryResultRow>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = current_schema()
         AND table_name = ANY($1::text[])`,
      [expectedTables]
    );
    const found = new Set(rows.map((row) => row.table_name));
    const missing = expectedTables.filter((table) => !found.has(table));
    if (missing.length > 0) {
      throw new Error(`Schema belum lengkap. Jalankan npm run migrate. Tiada: ${missing.join(', ')}`);
    }
    output(`✅ PostgreSQL tersambung dan ${expectedTables.length} jadual Mizuki tersedia.`);
  } finally {
    await closePool();
  }
}

async function listBackups(): Promise<void> {
  await fs.mkdir(backupDir, { recursive: true });
  const entries = await fs.readdir(backupDir, { withFileTypes: true });
  const backups = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && /\.pg\.sql(\.gz)?$/.test(entry.name))
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
  output(`Backup untuk database "${databaseName()}":`);
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
  if (/ECONNREFUSED|could not connect to server|timeout expired/i.test(message)) {
    process.stderr.write('💡 Pastikan PostgreSQL hidup dan DATABASE_URL/PGHOST dalam .env betul.\n');
  } else if (/password authentication failed|28P01/i.test(message)) {
    process.stderr.write('💡 Semak DATABASE_URL atau PGUSER/PGPASSWORD dalam fail .env.\n');
  } else if (/pg_dump|psql/i.test(message) && /ENOENT|not found|tidak dapat dimulakan/i.test(message)) {
    process.stderr.write('💡 Pasang PostgreSQL client tools atau tetapkan POSTGRES_BIN_DIR dalam .env.\n');
  }
  process.exitCode = 1;
});
