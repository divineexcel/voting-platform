import { endpoint, json } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { resultsSnapshot } from '@/lib/election';
export const dynamic = 'force-dynamic';
export const GET = endpoint(async request => {
  await requireUser(request);
  return json(await resultsSnapshot());
});
