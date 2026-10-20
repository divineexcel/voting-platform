import { endpoint, json, sessionCookie } from '@/lib/api';
import { deleteSession } from '@/lib/auth';
export const POST = endpoint(async request => {
  await deleteSession(request.cookies.get('session_token')?.value);
  return sessionCookie(json({ success: true }), '', 0);
});
