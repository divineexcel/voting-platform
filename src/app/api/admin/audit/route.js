import { endpoint, json } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { withDb } from '@/lib/db';
export const dynamic = 'force-dynamic';
export const GET = endpoint(async request => {
  await requireUser(request, ['admin']);
  return json({ events: await withDb(db => db.all(`SELECT a.id,a.event,a.target_id,a.created_at,u.name AS actor FROM audit_events a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.id DESC LIMIT 100`)) });
});
