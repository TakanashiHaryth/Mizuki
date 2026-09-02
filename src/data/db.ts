/**
 * PostgreSQL connection pool using node-postgres.
 * All repository modules use getPool() to acquire a shared pool.
 */

import { Pool, PoolConfig } from 'pg';
import { config } from '../config';
import { logger } from '../services/logger';

let pool: Pool | null = null;

function rejectLegacyMysqlConfiguration(): void {
  const hasPostgresConfig = [
    'DATABASE_URL',
    'PGHOST',
    'PGPORT',
    'PGUSER',
    'PGPASSWORD',
    'PGDATABASE',
  ].some((name) => Boolean(process.env[name]?.trim()));
  const hasLegacyConfig = [
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
  ].some((name) => Boolean(process.env[name]?.trim()));

  if (hasLegacyConfig && !hasPostgresConfig) {
    throw new Error(
      'MySQL DB_* settings are no longer used. Add DATABASE_URL or PostgreSQL PG* settings to .env.'
    );
  }
}

/**
 * Returns the shared PostgreSQL connection pool.
 * Creates it on first call (lazy init).
 */
export function getPool(): Pool {
  if (!pool) {
    rejectLegacyMysqlConfiguration();
    const connection: PoolConfig = config.db.connectionString
      ? { connectionString: config.db.connectionString }
      : {
          host: config.db.host,
          port: config.db.port,
          user: config.db.user,
          password: config.db.password,
          database: config.db.database,
        };
    const ssl: PoolConfig = config.db.ssl
      ? { ssl: { rejectUnauthorized: config.db.sslRejectUnauthorized } }
      : {};

    pool = new Pool({
      ...connection,
      ...ssl,
      max: 10,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
      keepAlive: true,
    });
    pool.on('error', (err) => logger.error({ err }, 'Unexpected idle PostgreSQL client error'));
    logger.info('PostgreSQL connection pool created');
  }
  return pool;
}

/**
 * Tests the database connection. Call on startup to fail fast.
 */
export async function testConnection(): Promise<void> {
  await getPool().query('SELECT 1');
  logger.info('PostgreSQL connection test successful');
}

/**
 * Closes the pool. Call on graceful shutdown.
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('PostgreSQL connection pool closed');
  }
}
