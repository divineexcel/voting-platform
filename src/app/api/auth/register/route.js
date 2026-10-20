import { endpoint, json, sessionCookie } from '@/lib/api';
import { body, limit, string } from '@/lib/security';
import { registerStudent } from '@/lib/election';
import { createSession, deleteSession } from '@/lib/auth';
export const POST = endpoint(async request => {
  const input = await body(request);
  const code = string(input.code, 'Registration code', 16, 19).replaceAll('-', '').toUpperCase();
  await limit(`register:${code}`, 10);
  await limit('register:global', 300);
  const user = await registerStudent(input);
  await deleteSession(request.cookies.get('session_token')?.value);
  const { token, expiresAt } = await createSession(user.id);
  return sessionCookie(json({ success: true, user }), token, expiresAt);
});
