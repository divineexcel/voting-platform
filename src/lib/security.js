import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { transaction } from './db.js';
const scrypt = promisify(scryptCallback);
const options = { N: 131072, r: 8, p: 1, maxmem: 192 * 1024 * 1024 };
export const digest = value => createHash('sha256').update(value).digest('hex');
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64, options);
  return `scrypt:131072:8:1:${salt}:${hash.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false;
  const [algorithm, n, r, p, salt, hash] = stored.split(':');
  if (algorithm !== 'scrypt' || n !== '131072' || r !== '8' || p !== '1' || !salt || !/^[a-f0-9]{128}$/.test(hash || '')) return false;
  const value = await scrypt(password, salt, 64, options);
  return timingSafeEqual(value, Buffer.from(hash, 'hex'));
}
export class AppError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
export function string(value, label, min = 1, max = 200) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw new AppError(400, 'INVALID_INPUT', `${label} must contain ${min}–${max} characters.`);
  return value.trim();
}
export function password(value) {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128) throw new AppError(400, 'INVALID_PASSWORD', 'Use a password with 12–128 characters.');
  return value;
}
export function username(value) {
  const result = string(value, 'Username', 3, 50).toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(result)) throw new AppError(400, 'INVALID_USERNAME', 'Use letters, numbers, dots, underscores or hyphens for your username.');
  return result;
}
export function identifier(value, label = 'ID') {
  if (!Number.isSafeInteger(value) || value < 1) throw new AppError(400, 'INVALID_INPUT', `${label} must be a positive integer.`);
  return value;
}
export async function body(request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new AppError(415, 'JSON_REQUIRED', 'Send this request as JSON.');
  if (Number(request.headers.get('content-length') || 0) > 16384) throw new AppError(413, 'BODY_TOO_LARGE', 'This request is too large.');
  const reader = request.body?.getReader();
  if (!reader) throw new AppError(400, 'INVALID_JSON', 'A JSON object is required.');
  const chunks = []; let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 16384) { await reader.cancel(); throw new AppError(413, 'BODY_TOO_LARGE', 'This request is too large.'); }
    chunks.push(Buffer.from(value));
  }
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!data || Array.isArray(data) || typeof data !== 'object') throw new Error();
    return data;
  } catch { throw new AppError(400, 'INVALID_JSON', 'A valid JSON object is required.'); }
}
export function checkOrigin(request) {
  const origin = request.headers.get('origin');
  const expected = process.env.APP_ORIGIN || new URL(request.url).origin;
  const site = request.headers.get('sec-fetch-site');
  if ((origin && origin !== expected) || site === 'cross-site' || site === 'same-site') throw new AppError(403, 'INVALID_ORIGIN', 'This request must come from this application.');
}
export async function limit(key, maximum = 10, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const accepted = await transaction(async db => {
    await db.run('DELETE FROM rate_limits WHERE reset_at <= ?', now);
    const keyHash = digest(key);
    const entry = await db.get('SELECT attempts FROM rate_limits WHERE key_hash=?', keyHash);
    if (entry && entry.attempts >= maximum) return false;
    await db.run(`INSERT INTO rate_limits(key_hash,attempts,reset_at) VALUES(?,1,?)
      ON CONFLICT(key_hash) DO UPDATE SET attempts=attempts+1`, keyHash, now + windowMs);
    return true;
  });
  if (!accepted) throw new AppError(429, 'RATE_LIMITED', 'Too many attempts. Please wait 15 minutes and try again.');
}
