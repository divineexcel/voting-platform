import { endpoint, json } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { body } from '@/lib/security';
import { withDb } from '@/lib/db';
import { reviewCandidate } from '@/lib/election';
export const dynamic = 'force-dynamic';
export const GET = endpoint(async request => {
  await requireUser(request, ['admin','subadmin']);
  const candidates = await withDb(db => db.all(`SELECT c.id,c.name,c.manifesto,c.status,c.created_at,p.name AS position_name,u.username AS applicant_username,u.active
    FROM candidates c JOIN positions p ON p.id=c.position_id JOIN users u ON u.id=c.applied_by_user_id ORDER BY c.id DESC`));
  return json({ candidates });
});
export const POST = endpoint(async request => {
  const user = await requireUser(request, ['admin','subadmin']);
  return json(await reviewCandidate(user.id, await body(request)));
});
