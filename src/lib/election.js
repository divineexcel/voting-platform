import { randomBytes, randomUUID } from 'node:crypto';
import { withDb, transaction, audit } from './db.js';
import { AppError, digest, hashPassword, string, username, password, identifier } from './security.js';

export function electionState(election, now = Date.now()) {
  if (election.status === 'closed' || (election.status === 'open' && election.closes_at && now >= Date.parse(election.closes_at))) return 'closed';
  if (election.status === 'open' && election.opens_at && now < Date.parse(election.opens_at)) return 'scheduled';
  return election.status;
}
export function publicElection(row) { return { ...row, state: electionState(row) }; }
function draftOnly(row) {
  if (row.status !== 'draft') throw new AppError(409, 'BALLOT_FROZEN', 'Candidate and election setup is locked once voting opens.');
}
const normalizeCode = value => string(value, 'Registration code', 16, 19).replaceAll('-', '').toUpperCase();

export async function registerStudent(input) {
  const code = normalizeCode(input.code);
  const login = username(input.username);
  const name = string(input.name, 'Full name', 2, 100);
  const hash = await hashPassword(password(input.password));
  return transaction(async db => {
    const election = await db.get('SELECT * FROM elections WHERE id=1');
    if (electionState(election) === 'closed') throw new AppError(409, 'REGISTRATION_CLOSED', 'Registration is closed for this election.');
    const found = await db.get('SELECT code_hash FROM registration_codes WHERE code_hash=? AND consumed=0 AND expires_at>?', digest(code), Date.now());
    if (!found) throw new AppError(400, 'INVALID_CODE', 'This registration code is invalid, expired or already used. Ask your election administrator for help.');
    if (await db.get('SELECT id FROM users WHERE username=?', login)) throw new AppError(409, 'USERNAME_TAKEN', 'This username is already registered.');
    const user = await db.run('INSERT INTO users(username,password,name,role) VALUES(?,?,?,?)', login, hash, name, 'student');
    const claim = await db.run('UPDATE registration_codes SET consumed=1,used_by_user_id=? WHERE code_hash=? AND consumed=0 AND expires_at>?', user.lastID, found.code_hash, Date.now());
    if (claim.changes !== 1) throw new AppError(409, 'CODE_USED', 'This registration code has already been used.');
    await db.run('UPDATE elections SET revision=revision+1 WHERE id=1');
    return { id: user.lastID, username: login, name, role: 'student' };
  });
}

export async function generateCodes(actor, count) {
  if (!Number.isSafeInteger(count) || count < 1 || count > 100) throw new AppError(400, 'INVALID_COUNT', 'Choose a whole number from 1 to 100.');
  return transaction(async db => {
    if (electionState(await db.get('SELECT * FROM elections WHERE id=1')) === 'closed') throw new AppError(409, 'REGISTRATION_CLOSED', 'This election is closed.');
    const codes = [];
    for (let i = 0; i < count; i++) {
      const code = randomBytes(8).toString('hex').toUpperCase();
      await db.run('INSERT INTO registration_codes(code_hash,display_suffix,expires_at) VALUES(?,?,?)', digest(code), code.slice(-4), Date.now() + 7 * 24 * 60 * 60 * 1000);
      codes.push(code.match(/.{4}/g).join('-'));
    }
    await audit(db, actor, 'registration_codes_generated');
    return codes;
  });
}

export async function positionsFor(user) {
  return withDb(async db => {
    await db.exec('BEGIN');
    try {
      const election = publicElection(await db.get('SELECT * FROM elections WHERE id=1'));
      const positions = await db.all('SELECT * FROM positions ORDER BY id');
      const candidates = await db.all("SELECT id,name,position_id,manifesto FROM candidates WHERE status='approved' ORDER BY name COLLATE NOCASE,id");
      const participation = user.role === 'student' ? await db.all('SELECT position_id FROM participation WHERE user_id=?', user.id) : [];
      const acceptedPositions = participation.map(row => row.position_id);
      const attempts = user.role === 'student' ? await db.all('SELECT position_id,version FROM ballot_attempts WHERE user_id=?', user.id) : [];
      const attemptVersions = Object.fromEntries(attempts.map(row => [row.position_id, row.version]));
      await db.exec('COMMIT');
      return { election, positions: positions.map(position => ({ ...position, candidates: candidates.filter(c => c.position_id === position.id) })), acceptedPositions, attemptVersions };
    } catch (error) { await db.exec('ROLLBACK'); throw error; }
  });
}

export async function castBallot(userId, input) {
  const positionId = identifier(input.positionId, 'Position');
  const candidateId = identifier(input.candidateId, 'Candidate');
  return transaction(async db => {
    const eligible = await db.get("SELECT id FROM users WHERE id=? AND role='student' AND active=1", userId);
    if (!eligible) throw new AppError(403, 'INELIGIBLE', 'This account is not eligible to vote.');
    // Reconciliation never returns or compares a candidate choice.
    if (await db.get('SELECT 1 FROM participation WHERE user_id=? AND position_id=?', userId, positionId)) {
      return { success: true, accepted: true, alreadyAccepted: true, positionId, message: 'Your ballot for this office has already been accepted.' };
    }
    const attemptVersion = input.attemptVersion ?? 0;
    if (!Number.isSafeInteger(attemptVersion) || attemptVersion < 0) throw new AppError(400, 'INVALID_ATTEMPT', 'Invalid ballot attempt.');
    const attempt = await db.get('SELECT version FROM ballot_attempts WHERE user_id=? AND position_id=?', userId, positionId);
    if (attemptVersion !== (attempt?.version || 0)) throw new AppError(409, 'STALE_ATTEMPT', 'This earlier submission was cancelled by a status check. Refresh your ballot before submitting again.');
    const election = await db.get('SELECT * FROM elections WHERE id=1');
    if (electionState(election) !== 'open') throw new AppError(409, 'VOTING_NOT_OPEN', 'Voting is not open for this election.');
    const candidate = await db.get("SELECT id FROM candidates WHERE id=? AND position_id=? AND status='approved'", candidateId, positionId);
    if (!candidate) throw new AppError(400, 'INVALID_CANDIDATE', 'Choose an approved candidate for this office.');
    await db.run('INSERT INTO participation(user_id,position_id) VALUES(?,?)', userId, positionId);
    await db.run('INSERT INTO ballots(id,position_id,candidate_id) VALUES(?,?,?)', randomUUID(), positionId, candidateId);
    await db.run('UPDATE elections SET revision=revision+1 WHERE id=1');
    return { success: true, accepted: true, alreadyAccepted: false, positionId, message: 'Your ballot has been accepted. Your choice is not included in your participation history.' };
  });
}

// A write barrier: either the earlier ballot committed, or its generation is revoked.
// A delayed POST with the old version can never accept after a negative reconciliation.
export async function reconcileBallot(userId, input) {
  const positionId = identifier(input.positionId, 'Position');
  return transaction(async db => {
    if (!await db.get("SELECT id FROM users WHERE id=? AND active=1 AND role='student'", userId)) throw new AppError(403, 'INELIGIBLE', 'This account is not eligible to vote.');
    if (!await db.get('SELECT id FROM positions WHERE id=?', positionId)) throw new AppError(404, 'POSITION_NOT_FOUND', 'This office does not exist.');
    if (await db.get('SELECT 1 FROM participation WHERE user_id=? AND position_id=?', userId, positionId)) return { accepted: true, positionId };
    await db.run('INSERT INTO ballot_attempts(user_id,position_id,version) VALUES(?,?,1) ON CONFLICT(user_id,position_id) DO UPDATE SET version=version+1', userId, positionId);
    const row = await db.get('SELECT version FROM ballot_attempts WHERE user_id=? AND position_id=?', userId, positionId);
    return { accepted: false, positionId, attemptVersion: row.version };
  });
}

export async function applyCandidacy(user, input) {
  const positionId = identifier(input.positionId, 'Position');
  const manifesto = string(input.manifesto, 'Statement', 20, 1500);
  return transaction(async db => {
    draftOnly(await db.get('SELECT * FROM elections WHERE id=1'));
    if (!await db.get('SELECT id FROM positions WHERE id=?', positionId)) throw new AppError(404, 'POSITION_NOT_FOUND', 'This office does not exist.');
    const existing = await db.get('SELECT id,status FROM candidates WHERE applied_by_user_id=? AND position_id=?', user.id, positionId);
    if (existing && existing.status !== 'rejected') throw new AppError(409, 'APPLICATION_EXISTS', 'You already have an application for this office.');
    if (existing) await db.run("UPDATE candidates SET manifesto=?,status='pending' WHERE id=?", manifesto, existing.id);
    else await db.run('INSERT INTO candidates(name,position_id,manifesto,applied_by_user_id) VALUES(?,?,?,?)', user.name, positionId, manifesto, user.id);
    await audit(db, user.id, 'candidacy_submitted', positionId);
    return { success: true, message: 'Your application is ready for administrator review.' };
  });
}

export async function reviewCandidate(actor, input) {
  const id = identifier(input.id);
  if (!['pending','approved','rejected'].includes(input.status)) throw new AppError(400, 'INVALID_STATUS', 'Choose pending, approved or rejected.');
  return transaction(async db => {
    draftOnly(await db.get('SELECT * FROM elections WHERE id=1'));
    const candidate = await db.get('SELECT c.id,u.active FROM candidates c JOIN users u ON u.id=c.applied_by_user_id WHERE c.id=?', id);
    if (!candidate) throw new AppError(404, 'NOT_FOUND', 'Application not found.');
    if (!candidate.active && input.status === 'approved') throw new AppError(409, 'INACTIVE_CANDIDATE', 'This candidate account has been deactivated.');
    await db.run('UPDATE candidates SET status=? WHERE id=?', input.status, id);
    await db.run('UPDATE elections SET revision=revision+1 WHERE id=1');
    await audit(db, actor, `candidate_${input.status}`, id);
    return { success: true, message: 'Application status updated.' };
  });
}

export async function deactivateStudent(actor, id) {
  identifier(id);
  return transaction(async db => {
    if (!await db.get("SELECT id FROM users WHERE id=? AND role='student'", id)) throw new AppError(404, 'NOT_FOUND', 'Student account not found.');
    await db.run('UPDATE users SET active=0 WHERE id=?', id);
    await db.run('DELETE FROM sessions WHERE user_id=?', id);
    await audit(db, actor, 'student_deactivated', id);
    return { success: true, message: 'Account deactivated. Accepted ballots and consumed registration codes are preserved.' };
  });
}

export async function updateElection(actor, input) {
  return transaction(async db => {
    const current = await db.get('SELECT * FROM elections WHERE id=1');
    if (input.action === 'configure') {
      draftOnly(current);
      const title = string(input.title, 'Election title', 3, 120);
      const dates = ['opens_at','closes_at'].map(key => {
        if (input[key] === null || input[key] === '') return null;
        if (typeof input[key] !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(input[key]) || !Number.isFinite(Date.parse(input[key]))) throw new AppError(400, 'INVALID_DATE', 'Provide valid opening and closing times.');
        return new Date(input[key]).toISOString();
      });
      if (dates[1] && Date.parse(dates[1]) <= Math.max(dates[0] ? Date.parse(dates[0]) : Date.now(), Date.now())) throw new AppError(400, 'INVALID_WINDOW', 'Closing time must be after opening time and in the future.');
      await db.run('UPDATE elections SET title=?,opens_at=?,closes_at=?,revision=revision+1 WHERE id=1', title, ...dates);
    } else if (input.action === 'open') {
      draftOnly(current);
      if (!await db.get("SELECT id FROM candidates WHERE status='approved' LIMIT 1")) throw new AppError(409, 'NO_CANDIDATES', 'Approve at least one candidate before opening voting.');
      if (current.closes_at && Date.parse(current.closes_at) <= Date.now()) throw new AppError(409, 'EXPIRED_WINDOW', 'Set a closing time in the future before opening voting.');
      await db.run("UPDATE elections SET status='open',revision=revision+1 WHERE id=1");
    } else if (input.action === 'close') {
      if (current.status !== 'open') throw new AppError(409, 'NOT_OPEN', 'Only an opened election can be closed.');
      await db.run("UPDATE elections SET status='closed',revision=revision+1 WHERE id=1");
    } else throw new AppError(400, 'INVALID_ACTION', 'Choose configure, open or close.');
    await audit(db, actor, `election_${input.action}`, 1);
    return { success: true, election: publicElection(await db.get('SELECT * FROM elections WHERE id=1')) };
  });
}

export async function resultsSnapshot() {
  return withDb(async db => {
    await db.exec('BEGIN');
    try {
      const election = publicElection(await db.get('SELECT * FROM elections WHERE id=1'));
      const positions = await db.all('SELECT * FROM positions ORDER BY id');
      const candidates = await db.all(`SELECT c.id,c.name,c.position_id,COUNT(b.id) AS vote_count FROM candidates c
        LEFT JOIN ballots b ON b.candidate_id=c.id WHERE c.status='approved'
        GROUP BY c.id ORDER BY c.name COLLATE NOCASE,c.id`);
      const counts = await db.get(`SELECT (SELECT COUNT(*) FROM ballots) AS totalVotesCast,
        (SELECT COUNT(DISTINCT user_id) FROM participation) AS uniqueVoters,
        (SELECT COUNT(*) FROM users WHERE role='student') AS registeredStudents`);
      const results = positions.map(position => {
        const entries = candidates.filter(c => c.position_id === position.id);
        const totalVotes = entries.reduce((sum, c) => sum + c.vote_count, 0);
        return { ...position, totalVotes, candidates: entries.map(c => ({ ...c, percentage: totalVotes ? Math.round(c.vote_count / totalVotes * 100) : 0 })) };
      });
      await db.exec('COMMIT');
      return { election, version: election.revision, observedAt: new Date().toISOString(), stats: { ...counts, participationRate: counts.registeredStudents ? Math.round(counts.uniqueVoters / counts.registeredStudents * 100) : 0 }, results };
    } catch (error) { await db.exec('ROLLBACK'); throw error; }
  });
}
