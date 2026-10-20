import { randomBytes } from 'node:crypto';
import { withDb, transaction } from './db.js';
import { digest, AppError } from './security.js';
export async function createSession(userId) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  await transaction(async db => {
    await db.run('DELETE FROM sessions WHERE expires_at <= ?', Date.now());
    await db.run('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)', digest(token), userId, expiresAt);
  });
  return { token, expiresAt };
}
export async function deleteSession(token) {
  if (token) await transaction(db => db.run('DELETE FROM sessions WHERE token_hash=?', digest(token)));
}
export async function getSessionUser(request) {
  const token = request.cookies.get('session_token')?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return withDb(db => db.get(`SELECT u.id,u.username,u.name,u.role FROM sessions s
    JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1`, digest(token), Date.now()));
}
export async function requireUser(request, roles) {
  const user = await getSessionUser(request);
  if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Please sign in to continue.');
  if (roles && !roles.includes(user.role)) throw new AppError(403, 'FORBIDDEN', 'Your account cannot perform this action.');
  return user;
}
