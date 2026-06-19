import { getDb } from './db';
import crypto from 'crypto';

const SESSION_COOKIE_NAME = 'session_token';
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Helper to generate a random session token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Create a new session in the database
export async function createSession(userId) {
  const db = await getDb();
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS).toISOString();

  await db.run(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
    [token, userId, expiresAt]
  );

  return { token, expiresAt };
}

// Delete a session from the database
export async function deleteSession(token) {
  if (!token) return;
  const db = await getDb();
  await db.run('DELETE FROM sessions WHERE token = ?', [token]);
}

// Get the authenticated user from the request cookies
export async function getSessionUser(request) {
  const tokenCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!tokenCookie) return null;

  const token = tokenCookie.value;
  const db = await getDb();

  // Find active session
  const session = await db.get(
    `SELECT s.token, s.expires_at, u.id, u.username, u.name, u.role
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.token = ?`,
    [token]
  );

  if (!session) return null;

  // Check if expired
  const now = new Date();
  const expiresAt = new Date(session.expires_at);
  if (now > expiresAt) {
    // Clean up expired session
    await db.run('DELETE FROM sessions WHERE token = ?', [token]);
    return null;
  }

  return {
    id: session.id,
    username: session.username,
    name: session.name,
    role: session.role
  };
}
