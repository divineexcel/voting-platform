import { endpoint, json } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { body } from '@/lib/security';
import { withDb } from '@/lib/db';
import { deactivateStudent } from '@/lib/election';
export const dynamic = 'force-dynamic';
export const GET = endpoint(async request => {
  await requireUser(request, ['admin','subadmin']);
  const students = await withDb(db => db.all(`SELECT id,username,name,active,created_at FROM users WHERE role='student' ORDER BY id DESC`));
  return json({ students });
});
export const DELETE = endpoint(async request => {
  const user = await requireUser(request, ['admin','subadmin']);
  return json(await deactivateStudent(user.id, (await body(request)).id));
});
