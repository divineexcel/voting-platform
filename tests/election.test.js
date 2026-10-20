import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const directory = await mkdtemp(path.join(os.tmpdir(), 'apexvote-test-'));
process.env.DATABASE_PATH = path.join(directory, 'fixture.sqlite');
const { withDb, transaction } = await import('../src/lib/db.js');
const { hashPassword, verifyPassword, digest, body, checkOrigin } = await import('../src/lib/security.js');
const { createSession, getSessionUser } = await import('../src/lib/auth.js');
const { generateCodes, registerStudent, applyCandidacy, reviewCandidate, castBallot, updateElection, positionsFor, deactivateStudent, resultsSnapshot, electionState, reconcileBallot } = await import('../src/lib/election.js');
test.after(async () => rm(directory, { recursive: true, force: true }));
let admin, first, second, candidate;
const fixturePassword = 'fixture-only-password-129!';

test('fresh database has no predictable administrator account', async () => {
  assert.equal((await withDb(db => db.get('SELECT COUNT(*) AS n FROM users'))).n, 0);
  const hash = await hashPassword(fixturePassword);
  const created = await transaction(db => db.run('INSERT INTO users(username,password,name,role) VALUES(?,?,?,?)', 'fixture-admin', hash, 'Fixture Admin', 'admin'));
  admin = created.lastID;
});
test('modern salted hashes verify exact passwords, not trimmed variants', async () => {
  const hash = await hashPassword(' fixture-password ');
  assert.ok(hash.startsWith('scrypt:131072:8:1:'));
  assert.equal(await verifyPassword(' fixture-password ', hash), true);
  assert.equal(await verifyPassword('fixture-password', hash), false);
  assert.equal(await verifyPassword(fixturePassword, 'old:hash'), false);
});
test('concurrent registration atomically consumes a code exactly once', async () => {
  const [code] = await generateCodes(admin, 1);
  const replies = await Promise.allSettled([1,2].map(i => registerStudent({ code, name: `Fixture ${i}`, username: `fixture-${i}`, password: fixturePassword })));
  assert.equal(replies.filter(r => r.status === 'fulfilled').length, 1);
  first = replies.find(r => r.status === 'fulfilled').value;
  assert.equal((await withDb(db => db.get("SELECT COUNT(*) AS n FROM users WHERE role='student'"))).n, 1);
  assert.equal((await withDb(db => db.get('SELECT SUM(consumed) AS n FROM registration_codes'))).n, 1);
  const [next] = await generateCodes(admin, 1);
  second = await registerStudent({ code: next, name: 'Fixture Other', username: 'fixture-other', password: fixturePassword });
});
test('only approved matching candidates can be selected, and draft votes are rejected', async () => {
  await applyCandidacy(first, { positionId: 1, manifesto: 'A fixture statement of at least twenty characters.' });
  candidate = (await withDb(db => db.get('SELECT id FROM candidates WHERE applied_by_user_id=?', first.id))).id;
  await reviewCandidate(admin, { id: candidate, status: 'approved' });
  await assert.rejects(castBallot(first.id, { positionId: 1, candidateId: candidate }), { code: 'VOTING_NOT_OPEN' });
  await updateElection(admin, { action: 'open' });
  await assert.rejects(castBallot(first.id, { positionId: 2, candidateId: candidate }), { code: 'INVALID_CANDIDATE' });
  await assert.rejects(reviewCandidate(admin, { id: candidate, status: 'rejected' }), { code: 'BALLOT_FROZEN' });
});
test('wrong-type identifiers fail before any ballot mutation', async () => {
  await assert.rejects(castBallot(second.id, { positionId: '1', candidateId: candidate }), { code: 'INVALID_INPUT' });
  await assert.rejects(castBallot(second.id, { positionId: 1, candidateId: -2 }), { code: 'INVALID_INPUT' });
  assert.equal((await withDb(db => db.get('SELECT COUNT(*) AS n FROM ballots'))).n, 0);
});
test('parallel ballot requests reconcile as accepted but count only once', async () => {
  const responses = await Promise.all(Array.from({ length: 8 }, () => castBallot(first.id, { positionId: 1, candidateId: candidate })));
  assert.equal(responses.filter(r => !r.alreadyAccepted).length, 1);
  assert.ok(responses.every(r => r.accepted && !('candidateId' in r)));
  assert.equal((await withDb(db => db.get('SELECT COUNT(*) AS n FROM ballots'))).n, 1);
  assert.equal((await withDb(db => db.get('SELECT COUNT(*) AS n FROM participation'))).n, 1);
});
test('negative reconciliation revokes delayed submissions without storing a choice fingerprint', async () => {
  const status = await reconcileBallot(second.id, { positionId: 2 });
  assert.equal(status.accepted, false);
  assert.equal(status.attemptVersion, 1);
  await assert.rejects(castBallot(second.id, { positionId: 2, candidateId: candidate }), { code: 'STALE_ATTEMPT' });
  await assert.rejects(castBallot(second.id, { positionId: 2, candidateId: candidate, attemptVersion: status.attemptVersion }), { code: 'INVALID_CANDIDATE' });
  assert.equal((await positionsFor(second)).attemptVersions[2], status.attemptVersion);
  assert.deepEqual(await reconcileBallot(first.id, { positionId: 1 }), { accepted: true, positionId: 1 });
  const columns = await withDb(db => db.all('PRAGMA table_info(ballot_attempts)'));
  assert.deepEqual(columns.map(c => c.name).sort(), ['position_id', 'user_id', 'version']);
});
test('participant status and live snapshots expose no voter-choice mapping', async () => {
  const positions = await positionsFor(first);
  assert.deepEqual(positions.acceptedPositions, [1]);
  assert.equal(positions.userVotes, undefined);
  const result = await resultsSnapshot();
  assert.equal(result.stats.totalVotesCast, 1);
  assert.equal(result.results[0].totalVotes, 1);
  assert.equal(result.results[0].candidates[0].vote_count, 1);
  for (const row of result.results.flatMap(r => r.candidates)) {
    assert.deepEqual(Object.keys(row).sort(), ['id','name','percentage','position_id','vote_count']);
  }
  const fields = await withDb(db => db.all('PRAGMA table_info(ballots)'));
  assert.deepEqual(fields.map(f => f.name).sort(), ['candidate_id','id','position_id']);
});
test('account deactivation preserves all accepted votes and consumed codes, revokes sessions', async () => {
  await castBallot(second.id, { positionId: 1, candidateId: candidate });
  const { token } = await createSession(first.id);
  const request = { cookies: { get: () => ({ value: token }) } };
  assert.equal((await getSessionUser(request)).id, first.id);
  await deactivateStudent(admin, first.id);
  assert.equal(await getSessionUser(request), undefined);
  const result = await resultsSnapshot();
  assert.equal(result.stats.totalVotesCast, 2);
  assert.equal(result.results[0].candidates[0].vote_count, 2);
  assert.equal((await withDb(db => db.get('SELECT COUNT(*) AS n FROM registration_codes WHERE consumed=1'))).n, 2);
  await assert.rejects(castBallot(first.id, { positionId: 1, candidateId: candidate }), { code: 'INELIGIBLE' });
  await assert.rejects(transaction(db => db.run('DELETE FROM ballots')), /immutable/);
  await assert.rejects(transaction(db => db.run('UPDATE registration_codes SET consumed=0')), /cannot reopen/);
});
test('sessions are hashed at rest and expire on the server', async () => {
  const { token } = await createSession(second.id);
  const row = await withDb(db => db.get('SELECT * FROM sessions WHERE token_hash=?', digest(token)));
  assert.notEqual(row.token_hash, token);
  await withDb(db => db.run('UPDATE sessions SET expires_at=0 WHERE token_hash=?', digest(token)));
  assert.equal(await getSessionUser({ cookies: { get: () => ({ value: token }) } }), undefined);
});
test('closed elections cannot be reopened and schedule boundaries use server time', async () => {
  assert.equal(electionState({ status: 'open', opens_at: '2030-01-01T00:00:00Z' }, 0), 'scheduled');
  assert.equal(electionState({ status: 'open', closes_at: '2020-01-01T00:00:00Z' }), 'closed');
  await updateElection(admin, { action: 'close' });
  await assert.rejects(updateElection(admin, { action: 'open' }), { code: 'BALLOT_FROZEN' });
  assert.equal((await resultsSnapshot()).election.state, 'closed');
});
test('malformed/oversized JSON and cross-origin mutations are rejected', async () => {
  await assert.rejects(body(new Request('http://localhost/api', { method: 'POST', headers: { 'Content-Type':'application/json' }, body:'{' })), { code:'INVALID_JSON' });
  await assert.rejects(body(new Request('http://localhost/api', { method: 'POST', headers: { 'Content-Type':'application/json' }, body:JSON.stringify({ data:'x'.repeat(20000) }) })), { code:'BODY_TOO_LARGE' });
  assert.throws(() => checkOrigin(new Request('http://localhost/api', { headers:{ Origin:'https://other.example' } })), { code:'INVALID_ORIGIN' });
});
test('an existing legacy database is refused without modifying its bytes', async () => {
  const { open } = await import('sqlite');
  const sqlite3 = (await import('sqlite3')).default;
  const { readFile } = await import('node:fs/promises');
  const legacyPath = path.join(directory, 'synthetic-legacy.sqlite');
  const db = await open({ filename: legacyPath, driver: sqlite3.Database });
  await db.exec('CREATE TABLE users(id INTEGER PRIMARY KEY); CREATE TABLE votes(id INTEGER PRIMARY KEY);');
  await db.close();
  const before = await readFile(legacyPath);
  const originalPath = process.env.DATABASE_PATH;
  try {
    process.env.DATABASE_PATH = legacyPath;
    await assert.rejects(withDb(connection => connection.get('SELECT 1')), /LEGACY_DATABASE_REQUIRES_APPROVED_MIGRATION/);
  } finally { process.env.DATABASE_PATH = originalPath; }
  assert.deepEqual(await readFile(legacyPath), before);
});

test('reconciliation and acceptance are serialized in either arrival order', async () => {
  const originalPath = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = path.join(directory, 'recovery-race.sqlite');
  try {
    const people = await transaction(async db => {
      const a = await db.run("INSERT INTO users(username,password,name,role) VALUES('race-a','fixture','Fixture A','student')");
      const b = await db.run("INSERT INTO users(username,password,name,role) VALUES('race-b','fixture','Fixture B','student')");
      const c = await db.run("INSERT INTO candidates(name,position_id,manifesto,status,applied_by_user_id) VALUES('Fixture candidate',1,'Fixture statement','approved',?)", a.lastID);
      await db.run("UPDATE elections SET status='open' WHERE id=1");
      return { a:a.lastID, b:b.lastID, candidate:c.lastID };
    });
    const [ballot, accepted] = await Promise.all([
      castBallot(people.a, {positionId:1,candidateId:people.candidate}),
      reconcileBallot(people.a, {positionId:1})
    ]);
    assert.equal(ballot.accepted,true);assert.equal(accepted.accepted,true);
    const [cancelled, late] = await Promise.allSettled([
      reconcileBallot(people.b, {positionId:1}),
      castBallot(people.b, {positionId:1,candidateId:people.candidate})
    ]);
    assert.equal(cancelled.value.accepted,false);assert.equal(late.reason.code,'STALE_ATTEMPT');
    await castBallot(people.b,{positionId:1,candidateId:people.candidate,attemptVersion:cancelled.value.attemptVersion});
    assert.equal((await resultsSnapshot()).stats.totalVotesCast,2);
  } finally { process.env.DATABASE_PATH = originalPath; }
});
