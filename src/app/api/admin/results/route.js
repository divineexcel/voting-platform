import { endpoint, json } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { withDb } from '@/lib/db';
import { resultsSnapshot } from '@/lib/election';
export const dynamic = 'force-dynamic';
export const GET = endpoint(async request => {
  await requireUser(request, ['admin','subadmin']);
  const data = await resultsSnapshot();
  const codes = await withDb(db => db.get('SELECT COUNT(*) AS count FROM registration_codes'));
  return json({ ...data, stats: { ...data.stats, totalCodes: codes.count } });
});
