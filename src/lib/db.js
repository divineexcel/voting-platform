import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import crypto from 'crypto';

// Path to SQLite database file
const DB_PATH = path.join(process.cwd(), 'database.sqlite');

let dbInstance = null;
let isInitializing = false;

// Password Hashing Helper
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedPassword) {
  if (!storedPassword || !storedPassword.includes(':')) return false;
  const [salt, originalHash] = storedPassword.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

// Get or open database connection
export async function getDb() {
  if (dbInstance) return dbInstance;

  dbInstance = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });

  if (!isInitializing) {
    isInitializing = true;
    try {
      await initDb();
    } catch (e) {
      console.error('Failed to auto-initialize DB:', e);
    } finally {
      isInitializing = false;
    }
  }

  return dbInstance;
}

// Initialize database schema and seeds
export async function initDb() {
  const db = await getDb();

  // Enable foreign keys
  await db.run('PRAGMA foreign_keys = ON;');

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
    const defaultAdminPassword = hashPassword('admin123');
    await db.run(
      'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
      ['admin', defaultAdminPassword, 'Super Administrator', 'admin']
    );
    console.log('Database: Default Super Admin account seeded successfully (admin/admin123)');
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
        'INSERT INTO positions (name, description) VALUES (?, ?)',
        [pos.name, pos.description]
      );
    }
    console.log('Database: Default voting positions seeded successfully');
  }
}
