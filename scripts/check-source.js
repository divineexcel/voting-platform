import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

async function files(directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await files(target));
    else if (target.endsWith('.js')) found.push(target);
  }
  return found;
}
let failed = false;
for (const file of [...await files('src/lib'), ...await files('src/app/api'), ...await files('scripts'), ...await files('tests'), 'verify-api.js']) {
  const check = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (check.status !== 0) { console.error(check.stderr); failed = true; }
}
if (failed) process.exitCode = 1;
else console.log('Server, route, script and test syntax checks passed. JSX is validated by next build.');
