import { endpoint, json } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { body } from '@/lib/security';
import { withDb } from '@/lib/db';
import { generateCodes } from '@/lib/election';
export const dynamic = 'force-dynamic';
export const GET = endpoint(async request => {
  await requireUser(request, ['admin','subadmin']);
  const codes = await withDb(db => db.all(`SELECT rc.display_suffix,rc.consumed,rc.expires_at,rc.created_at,u.name AS student_name,u.username AS student_username
    FROM registration_codes rc LEFT JOIN users u ON u.id=rc.used_by_user_id ORDER BY rc.created_at DESC,rc.display_suffix`));
  return json({ codes });
});
export const POST = endpoint(async request => {
  const user = await requireUser(request, ['admin','subadmin']);
  return json({ success: true, codes: await generateCodes(user.id, (await body(request)).count), message: 'Save these codes now. For privacy, full codes are shown only once.' });
});
