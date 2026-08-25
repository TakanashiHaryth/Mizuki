/**
 * Database migration script.
 * Runs the full DDL from Part 3 of the Mizuki documentation.
 * Usage: npm run migrate
 */

import { getPool, closePool } from './db';
import { logger } from '../services/logger';

const DDL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    wa_jid VARCHAR(64) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME,
    memory_opt_out BOOLEAN DEFAULT FALSE
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS \`groups\` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    wa_group_id VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255),
    personality VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS group_members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    group_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('member','admin') DEFAULT 'member',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_group_user (group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES \`groups\`(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS admin_actions_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    group_id INT NOT NULL,
    actor_user_id INT NOT NULL,
    target_user_id INT,
    action_type ENUM('kick','promote','demote','tagall') NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES \`groups\`(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_user_id) REFERENCES users(id),
    FOREIGN KEY (target_user_id) REFERENCES users(id)
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS command_usage_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    group_id INT,
    user_id INT NOT NULL,
    command VARCHAR(64) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES \`groups\`(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS rate_limits (
    id INT PRIMARY KEY AUTO_INCREMENT,
    group_id INT NOT NULL,
    command VARCHAR(64) NOT NULL,
    last_used_at DATETIME NOT NULL,
    UNIQUE KEY uq_group_command (group_id, command),
    FOREIGN KEY (group_id) REFERENCES \`groups\`(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS user_rate_limits (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    action VARCHAR(64) NOT NULL,
    window_started_at DATETIME NOT NULL,
    usage_count INT NOT NULL DEFAULT 0,
    UNIQUE KEY uq_user_action (user_id, action),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS ai_memory (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    group_id INT,
    role ENUM('user','assistant') NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES \`groups\`(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS media_jobs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    job_type ENUM('sticker_to_image','image_to_sticker','gif_to_video','video_to_gif') NOT NULL,
    status ENUM('pending','processing','done','failed') DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
];

const INDEX_STATEMENTS = [
  `CREATE INDEX IF NOT EXISTS idx_ai_memory_user ON ai_memory(user_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_ai_memory_user_group ON ai_memory(user_id, group_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_command_log_group ON command_usage_log(group_id, created_at)`,
];

const SCHEMA_UPDATE_STATEMENTS = [
  `ALTER TABLE \`groups\` ADD COLUMN personality VARCHAR(500) NULL AFTER name`,
];

async function migrate(): Promise<void> {
  const pool = getPool();

  logger.info('Starting database migration...');

  for (const sql of DDL_STATEMENTS) {
    const tableName = sql.match(/CREATE TABLE IF NOT EXISTS [`]?(\w+)[`]?/)?.[1] || 'unknown';
    await pool.execute(sql);
    logger.info(`✓ Table "${tableName}" ready`);
  }

  for (const sql of SCHEMA_UPDATE_STATEMENTS) {
    try {
      await pool.execute(sql);
      logger.info('✓ Database schema updated');
    } catch (err: any) {
      if (err.code !== 'ER_DUP_FIELDNAME') throw err;
    }
  }

  for (const sql of INDEX_STATEMENTS) {
    try {
      await pool.execute(sql);
    } catch (err: any) {
      // Index might already exist — that's fine
      if (err.code !== 'ER_DUP_KEYNAME') throw err;
    }
    logger.info('✓ Index applied');
  }

  logger.info('Database migration complete!');
  await closePool();
}

// Run directly when executed as a script
migrate().catch((err) => {
  logger.error(err, 'Migration failed');
  process.exit(1);
});
