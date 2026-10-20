import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';

function state() {
  const key = Symbol.for(`apexvote.database.v2:${databasePath()}`);
  return globalThis[key] ??= { initialization: undefined, writes: Promise.resolve() };
}
export function databasePath() {
  if (process.env.DATABASE_PATH) return path.resolve(process.env.DATABASE_PATH);
  if (process.env.NODE_ENV === 'production') throw new Error('DATABASE_PATH_REQUIRED');
  return path.join(process.cwd(), '.data', 'voting-v2.sqlite');
}
async function connect() {
  const filename = databasePath();
  await mkdir(path.dirname(filename), { recursive: true, mode: 0o700 });
  const db = await open({ filename, driver: sqlite3.Database });
  await db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=10000;');
  return db;
}
async function initialize() {
  const db = await connect();
  try {
    const legacy = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='votes'");
    const version = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_metadata'");
    if (legacy || (!version && await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'"))) throw new Error('LEGACY_DATABASE_REQUIRES_APPROVED_MIGRATION');
    await db.exec('PRAGMA journal_mode=WAL;');
    await db.exec(`
      CREATE TABLE IF NOT EXISTS schema_metadata (version INTEGER PRIMARY KEY CHECK(version=2));
      INSERT OR IGNORE INTO schema_metadata VALUES(2);
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL, name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin','subadmin','student')),
        active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
      CREATE TABLE IF NOT EXISTS registration_codes (
        code_hash TEXT PRIMARY KEY, display_suffix TEXT NOT NULL,
        consumed INTEGER NOT NULL DEFAULT 0 CHECK(consumed IN (0,1)),
        used_by_user_id INTEGER REFERENCES users(id), expires_at INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS elections (
        id INTEGER PRIMARY KEY CHECK(id=1), title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','open','closed')),
        opens_at TEXT, closes_at TEXT, revision INTEGER NOT NULL DEFAULT 0
      );
      INSERT OR IGNORE INTO elections(id,title) VALUES(1,'Student council election');
      CREATE TABLE IF NOT EXISTS positions (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, description TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS candidates (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
        position_id INTEGER NOT NULL REFERENCES positions(id), manifesto TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
        applied_by_user_id INTEGER NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(applied_by_user_id,position_id), UNIQUE(id,position_id)
      );
      CREATE TABLE IF NOT EXISTS participation (
        user_id INTEGER NOT NULL REFERENCES users(id), position_id INTEGER NOT NULL REFERENCES positions(id),
        PRIMARY KEY(user_id,position_id)
      ) WITHOUT ROWID;
      CREATE TABLE IF NOT EXISTS ballot_attempts (
        user_id INTEGER NOT NULL REFERENCES users(id), position_id INTEGER NOT NULL REFERENCES positions(id),
        version INTEGER NOT NULL DEFAULT 0 CHECK(version>=0), PRIMARY KEY(user_id,position_id)
      ) WITHOUT ROWID;
      CREATE TABLE IF NOT EXISTS ballots (
        id TEXT PRIMARY KEY, position_id INTEGER NOT NULL REFERENCES positions(id), candidate_id INTEGER NOT NULL,
        FOREIGN KEY(candidate_id,position_id) REFERENCES candidates(id,position_id)
      ) WITHOUT ROWID;
      CREATE INDEX IF NOT EXISTS ballots_candidate ON ballots(candidate_id);
      CREATE INDEX IF NOT EXISTS ballots_position ON ballots(position_id);
      CREATE TABLE IF NOT EXISTS audit_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT, actor_id INTEGER REFERENCES users(id), event TEXT NOT NULL, target_id TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS rate_limits (key_hash TEXT PRIMARY KEY, attempts INTEGER NOT NULL, reset_at INTEGER NOT NULL);
      CREATE TRIGGER IF NOT EXISTS immutable_ballot_update BEFORE UPDATE ON ballots
        BEGIN SELECT RAISE(ABORT,'accepted ballots are immutable'); END;
      CREATE TRIGGER IF NOT EXISTS immutable_ballot_delete BEFORE DELETE ON ballots
        BEGIN SELECT RAISE(ABORT,'accepted ballots are immutable'); END;
      CREATE TRIGGER IF NOT EXISTS immutable_participation_delete BEFORE DELETE ON participation
        BEGIN SELECT RAISE(ABORT,'accepted participation is immutable'); END;
      CREATE TRIGGER IF NOT EXISTS immutable_participation_update BEFORE UPDATE ON participation
        BEGIN SELECT RAISE(ABORT,'accepted participation is immutable'); END;
      CREATE TRIGGER IF NOT EXISTS immutable_code_claim BEFORE UPDATE OF consumed ON registration_codes
        WHEN OLD.consumed=1 AND NEW.consumed<>1
        BEGIN SELECT RAISE(ABORT,'consumed codes cannot reopen'); END;
      CREATE TRIGGER IF NOT EXISTS immutable_audit_update BEFORE UPDATE ON audit_events
        BEGIN SELECT RAISE(ABORT,'audit events are append only'); END;
      CREATE TRIGGER IF NOT EXISTS immutable_audit_delete BEFORE DELETE ON audit_events
        BEGIN SELECT RAISE(ABORT,'audit events are append only'); END;
    `);
    for (const [name, description] of [
      ['Head Boy','Student leadership and representation.'], ['Head Girl','Student leadership and representation.'],
      ['Sports Prefect','Sport, teamwork and school activities.'], ['Library Prefect','Reading, learning and library resources.'],
      ['Sanitation Prefect','A clean and welcoming school environment.']
    ]) await db.run('INSERT OR IGNORE INTO positions(name,description) VALUES(?,?)', name, description);
  } finally { await db.close(); }
}
export async function withDb(work) {
  const current = state();
  current.initialization ??= initialize().catch(error => { current.initialization = undefined; throw error; });
  await current.initialization;
  const db = await connect();
  try { return await work(db); } finally { await db.close(); }
}
export function transaction(work) {
  const current = state();
  const pending = current.writes.then(() => withDb(async db => {
    await db.exec('BEGIN IMMEDIATE');
    try { const result = await work(db); await db.exec('COMMIT'); return result; }
    catch (error) { await db.exec('ROLLBACK'); throw error; }
  }));
  current.writes = pending.catch(() => {});
  return pending;
}
export async function audit(db, actor, event, target = null) {
  await db.run('INSERT INTO audit_events(actor_id,event,target_id) VALUES(?,?,?)', actor, event, target === null ? null : String(target));
}
