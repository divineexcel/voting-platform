import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const destination = new URL(base);
if (!['127.0.0.1','localhost','[::1]'].includes(destination.hostname) || process.env.ALLOW_TEST_FIXTURES !== '1') {
  throw new Error('This mutating integration script requires ALLOW_TEST_FIXTURES=1 and an explicitly disposable localhost database.');
}
if (!process.env.TEST_ADMIN_USERNAME || !process.env.TEST_ADMIN_PASSWORD) throw new Error('Set fixture administrator credentials privately through the environment.');
let cookie = '';
async function call(route, method='GET', body, credential=cookie, extraHeaders={}) {
  const response = await fetch(base+route, { method, headers: { 'Content-Type':'application/json', ...(credential ? { Cookie:credential } : {}), ...extraHeaders }, body:body === undefined ? undefined : JSON.stringify(body) });
  return { status:response.status, data:await response.json(), cookie:response.headers.get('set-cookie')?.split(';')[0] };
}
const suffix=randomBytes(5).toString('hex');
const login=await call('/api/auth/login','POST',{ username:process.env.TEST_ADMIN_USERNAME,password:process.env.TEST_ADMIN_PASSWORD });
assert.equal(login.status,200); const admin=login.cookie;
assert.equal((await call('/api/admin/codes','GET',undefined,'')).status,401);
const codeReply=await call('/api/admin/codes','POST',{count:1},admin); assert.equal(codeReply.status,200);
const registered=await call('/api/auth/register','POST',{code:codeReply.data.codes[0],name:'Disposable integration student',username:'fixture-'+suffix,password:randomBytes(20).toString('hex')},'');
assert.equal(registered.status,200);cookie=registered.cookie;
assert.equal((await call('/api/admin/results')).status,403);
assert.equal((await call('/api/candidates/apply','POST',{positionId:1,manifesto:'Disposable integration fixture statement for the office.'})).status,200);
const applications=await call('/api/candidates/apply');const candidate=applications.data.applications[0].id;
assert.equal((await call('/api/admin/candidates','POST',{id:candidate,status:'approved'},admin)).status,200);
assert.equal((await call('/api/admin/election','POST',{action:'open'},admin)).status,200);
const attempts=await Promise.all(Array.from({length:8},()=>call('/api/votes/cast','POST',{positionId:1,candidateId:candidate})));
assert.ok(attempts.every(x=>x.status===200&&x.data.accepted));assert.equal(attempts.filter(x=>!x.data.alreadyAccepted).length,1);
const snapshot=await call('/api/results/live');assert.equal(snapshot.data.stats.totalVotesCast,1);assert.equal(snapshot.data.results[0].totalVotes,1);
const positions=await call('/api/positions');assert.deepEqual(positions.data.acceptedPositions,[1]);assert.equal(positions.data.userVotes,undefined);
assert.equal((await call('/api/admin/candidates','POST',{id:candidate,status:'rejected'},admin)).status,409);
const students=await call('/api/admin/students','GET',undefined,admin);assert.ok(students.data.students.every(s=>!('password' in s)));
assert.equal((await call('/api/admin/students','DELETE',{id:registered.data.user.id},admin)).status,200);
assert.equal((await call('/api/positions')).status,401);
const after=await call('/api/admin/results','GET',undefined,admin);assert.equal(after.data.stats.totalVotesCast,1);assert.equal(after.data.results[0].totalVotes,1);
assert.equal((await call('/api/admin/election','POST',{action:'close'},admin)).status,200);
assert.equal((await call('/api/admin/election','POST',{action:'open'},admin)).status,409);
assert.equal((await call('/api/auth/login','POST',{username:{invalid:1},password:'fixture'},'',{Origin:base})).status,400);
assert.equal((await call('/api/auth/logout','POST',undefined,admin,{Origin:'https://untrusted.example'})).status,403);
console.log('PASS: isolated HTTP registration, role boundaries, ballot acceptance/concurrency, privacy response, archival preservation, lifecycle and origin checks.');
