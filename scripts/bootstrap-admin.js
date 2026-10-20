import { hashPassword, password, username, string } from '../src/lib/security.js';
import { transaction, audit } from '../src/lib/db.js';

try {
  const login = username(process.env.ADMIN_USERNAME || 'admin');
  const name = string(process.env.ADMIN_NAME || 'Election administrator', 'Name', 2, 100);
  const hash = await hashPassword(password(process.env.ADMIN_PASSWORD));
  await transaction(async db => {
    if (await db.get("SELECT id FROM users WHERE role='admin' LIMIT 1")) throw new Error('An administrator already exists. Bootstrap will not overwrite an account.');
    const result = await db.run('INSERT INTO users(username,password,name,role) VALUES(?,?,?,?)', login, hash, name, 'admin');
    await audit(db, result.lastID, 'administrator_bootstrapped', result.lastID);
  });
  console.log('Administrator created. Sign in through /admin. No credentials were printed.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
