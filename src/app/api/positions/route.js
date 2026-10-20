import { endpoint, json } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { positionsFor } from '@/lib/election';
export const dynamic = 'force-dynamic';
export const GET = endpoint(async request => json(await positionsFor(await requireUser(request))));
