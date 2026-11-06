import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { createClient } from '@libsql/client';
import path from 'path';
import crypto from 'crypto';

// Path to SQLite database file
const DB_PATH = path.join(process.cwd(), 'database.sqlite');

let dbInstance = null;
let dbPromise = null;

function createTursoAdapter(client) {
  return {
    async all(sql, params = []) {
      const result = await client.execute({ sql, args: params });
      return result.rows.map((row) => ({ ...row }));
    },
    async get(sql, params = []) {
      const result = await client.execute({ sql, args: params });
      return result.rows.length ? { ...result.rows[0] } : undefined;
    },
    async run(sql, params = []) {
      const result = await client.execute({ sql, args: params });
      return {
        lastID: result.lastInsertRowid === undefined ? undefined : Number(result.lastInsertRowid),
        changes: result.rowsAffected,
      };
    },
    async exec(sql) {
      return client.executeMultiple(sql);
    },
  };
}

// Password Hashing Helper
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedPassword) {
  if (typeof password !== 'string' || typeof storedPassword !== 'string' || !storedPassword.includes(':')) return false;
  const [salt, originalHash] = storedPassword.split(':');
  if (!salt || !/^[a-f0-9]+$/i.test(originalHash || '')) return false;
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  const expected = Buffer.from(originalHash, 'hex');
  const actual = Buffer.from(hash, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
}

// Get or open database connection
export async function getDb() {
  if (dbPromise) return dbPromise;
  if (dbInstance) return dbInstance;
  dbPromise = (async () => {
    let db;
    try {
      const databaseUrl = process.env.TURSO_DATABASE_URL;
      const authToken = process.env.TURSO_AUTH_TOKEN;
      const isTursoConfigured = Boolean(databaseUrl || authToken);

      if (isTursoConfigured && (!databaseUrl || !authToken)) {
        throw new Error('Both TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be configured.');
      }
      if (process.env.NODE_ENV === 'production' && !isTursoConfigured) {
        throw new Error('Turso is required in production. Configure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.');
      }

      db = isTursoConfigured
        ? createTursoAdapter(createClient({ url: databaseUrl, authToken, intMode: 'number' }))
        : await open({ filename: DB_PATH, driver: sqlite3.Database });
      await initDb(db);
      dbInstance = db;
      return db;
    } catch (error) {
      dbPromise = null;
      await db.close?.();
      throw error;
    }
  })();
  return dbPromise;
}

// Initialize database schema and seeds
export async function initDb(connection) {
  const db = connection || await getDb();

  // Enable foreign keys
  if (!process.env.TURSO_DATABASE_URL) {
    await db.run('PRAGMA foreign_keys = ON;');
  }

  // Create Users table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL, -- 'admin', 'subadmin', 'student'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const userColumns = await db.all('PRAGMA table_info(users)');
  if (!userColumns.some((column) => column.name === 'email')) {
    await db.run('ALTER TABLE users ADD COLUMN email TEXT');
  }
  await db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique
    ON users(email COLLATE NOCASE)
    WHERE email IS NOT NULL AND email != '';
  `);

  // Create Positions table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT
    );
  `);

  // Create Candidates table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      position_id INTEGER NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
      manifesto TEXT,
      status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
      applied_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create Votes table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      position_id INTEGER NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
      candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(voter_id, position_id)
    );
  `);

  // Create Sessions table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at DATETIME NOT NULL
    );
  `);

  // Seed default super admin user if not exists
  const adminExists = await db.get('SELECT id FROM users WHERE username = ?', ['admin']);
  if (!adminExists) {
    const initialAdminPassword = process.env.ADMIN_INITIAL_PASSWORD || (process.env.TURSO_DATABASE_URL ? null : 'admin123');
    if (!initialAdminPassword) {
      throw new Error('Set ADMIN_INITIAL_PASSWORD before initializing a new Turso database.');
    }
    const defaultAdminPassword = hashPassword(initialAdminPassword);
    await db.run(
      'INSERT OR IGNORE INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
      ['admin', defaultAdminPassword, 'Super Administrator', 'admin']
    );
    console.log('Database: Super Admin account seeded successfully.');
  }

  // Seed default positions if they are empty
  const positionsCount = await db.get('SELECT COUNT(*) as count FROM positions');
  if (positionsCount.count === 0) {
    const defaultPositions = [
      { name: 'Head Boy', description: 'Leader and representative of the male students.' },
      { name: 'Head Girl', description: 'Leader and representative of the female students.' },
      { name: 'Sports Prefect', description: 'Coordinator of school sports activities and games.' },
      { name: 'Library Prefect', description: 'Overseer of library orderliness and textbook resources.' },
      { name: 'Sanitation Prefect', description: 'Responsible for maintaining cleanliness across the school premises.' }
    ];

    for (const pos of defaultPositions) {
      await db.run(
        'INSERT OR IGNORE INTO positions (name, description) VALUES (?, ?)',
        [pos.name, pos.description]
      );
    }
    console.log('Database: Default voting positions seeded successfully');
  }
}
