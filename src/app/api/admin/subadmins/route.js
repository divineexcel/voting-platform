import { endpoint, json } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { body, string, username, password, hashPassword, AppError } from '@/lib/security';
import { transaction, audit } from '@/lib/db';
export const POST = endpoint(async request => {
  const user = await requireUser(request, ['admin']);
  const input = await body(request);
  const login = username(input.username), name = string(input.name, 'Name', 2, 100);
  const hash = await hashPassword(password(input.password));
  await transaction(async db => {
    if (await db.get('SELECT id FROM users WHERE username=?', login)) throw new AppError(409, 'USERNAME_TAKEN', 'This username is already registered.');
    const created = await db.run('INSERT INTO users(username,name,password,role) VALUES(?,?,?,?)', login, name, hash, 'subadmin');
    await audit(db, user.id, 'subadmin_created', created.lastID);
  });
  return json({ success: true, message: 'Election staff account created.' });
});
