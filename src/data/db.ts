/**
 * MySQL connection pool using mysql2/promise.
 * All repository modules use getPool() to acquire a shared pool.
 */

import mysql from 'mysql2/promise';
import { config } from '../config';
import { logger } from '../services/logger';

let pool: mysql.Pool | null = null;

/**
 * Returns the shared MySQL connection pool.
 * Creates it on first call (lazy init).
 */
export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });
    logger.info('MySQL connection pool created');
  }
  return pool;
}

/**
 * Tests the database connection. Call on startup to fail fast.
 */
export async function testConnection(): Promise<void> {
  const connection = await getPool().getConnection();
  try {
    await connection.ping();
    logger.info('MySQL connection test successful');
  } finally {
    connection.release();
  }
}

/**
 * Closes the pool. Call on graceful shutdown.
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('MySQL connection pool closed');
  }
}
