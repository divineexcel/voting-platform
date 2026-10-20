import { endpoint, json } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { body } from '@/lib/security';
import { withDb } from '@/lib/db';
import { publicElection, updateElection } from '@/lib/election';
export const dynamic = 'force-dynamic';
export const GET = endpoint(async request => {
  await requireUser(request, ['admin','subadmin']);
  return json({ election: await withDb(async db => publicElection(await db.get('SELECT * FROM elections WHERE id=1'))) });
});
export const POST = endpoint(async request => {
  const user = await requireUser(request, ['admin']);
  return json(await updateElection(user.id, await body(request)));
});
