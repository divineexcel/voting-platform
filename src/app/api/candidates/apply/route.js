import { endpoint, json } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { body } from '@/lib/security';
import { withDb } from '@/lib/db';
import { applyCandidacy } from '@/lib/election';
export const dynamic = 'force-dynamic';
export const GET = endpoint(async request => {
  const user = await requireUser(request, ['student']);
  const applications = await withDb(db => db.all(`SELECT c.id,c.name,c.manifesto,c.status,c.created_at,p.name AS position_name,p.id AS position_id
    FROM candidates c JOIN positions p ON p.id=c.position_id WHERE c.applied_by_user_id=? ORDER BY c.id DESC`, user.id));
  return json({ applications });
});
export const POST = endpoint(async request => {
  const user = await requireUser(request, ['student']);
  return json(await applyCandidacy(user, await body(request)));
});
