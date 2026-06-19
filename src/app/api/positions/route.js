import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();

    // Fetch all positions
    const positions = await db.all('SELECT * FROM positions ORDER BY id ASC');

    // Fetch approved candidates for each position
    const candidates = await db.all(
      `SELECT c.id, c.name, c.position_id, c.manifesto, u.username as applicant_username
       FROM candidates c
       JOIN users u ON c.applied_by_user_id = u.id
       WHERE c.status = 'approved'
       ORDER BY c.name ASC`
    );

    // Map candidates to their respective positions
    const positionsWithCandidates = positions.map(pos => {
      return {
        ...pos,
        candidates: candidates.filter(cand => cand.position_id === pos.id)
      };
    });

    // Fetch user's votes if they are a student
    let userVotes = {};
    if (user.role === 'student') {
      const votes = await db.all(
        'SELECT position_id, candidate_id FROM votes WHERE voter_id = ?',
        [user.id]
      );
      // Map to key-value: { positionId: candidateId }
      votes.forEach(vote => {
        userVotes[vote.position_id] = vote.candidate_id;
      });
    }

    return NextResponse.json({
      positions: positionsWithCandidates,
      userVotes
    });
  } catch (error) {
    console.error('Positions fetch error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching positions' },
      { status: 500 }
    );
  }
}
