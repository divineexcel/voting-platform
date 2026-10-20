import { endpoint, json } from '@/lib/api';
import { getSessionUser } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const GET = endpoint(async request => json({ user: await getSessionUser(request) || null }));
