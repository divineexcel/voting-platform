import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const user = await getSessionUser(request);
    if (!user || (user.role !== 'admin' && user.role !== 'subadmin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = await getDb();

    // 1. Fetch total registered student accounts
    const registeredCount = await db.get(
      "SELECT COUNT(*) as count FROM users WHERE role = 'student'"
    );
    const registeredStudents = registeredCount.count;

    // 2. Fetch total votes cast (voters who voted, distinct voter/position or total vote count)
    // In our system, a vote is cast per position. Total votes cast can be the number of rows in the votes table.
    const votesCount = await db.get('SELECT COUNT(*) as count FROM votes');
    const totalVotesCast = votesCount.count;

    // 3. Calculate participation rate (percentage of registered students who cast at least one vote)
    const distinctVotersCount = await db.get('SELECT COUNT(DISTINCT voter_id) as count FROM votes');
    const uniqueVoters = distinctVotersCount.count;
    const participationRate = registeredStudents > 0 
      ? Math.round((uniqueVoters / registeredStudents) * 100) 
      : 0;

    // 5. Fetch positions
    const positions = await db.all('SELECT * FROM positions ORDER BY id ASC');

    // 6. Fetch approved candidates with vote counts
    const candidateResults = await db.all(
      `SELECT c.id, c.name, c.position_id, c.manifesto, u.username as applicant_username,
              (SELECT COUNT(*) FROM votes v WHERE v.candidate_id = c.id) as vote_count
       FROM candidates c
       JOIN users u ON c.applied_by_user_id = u.id
       WHERE c.status = 'approved'
       ORDER BY vote_count DESC, c.name ASC`
    );

    // Group candidates by position
    const results = positions.map(pos => {
      const positionCandidates = candidateResults.filter(c => c.position_id === pos.id);
      
      // Calculate total votes cast for this position
      const totalPosVotes = positionCandidates.reduce((sum, c) => sum + c.vote_count, 0);

      // Add percentage calculation to candidates
      const candidatesWithPct = positionCandidates.map(c => ({
        ...c,
        percentage: totalPosVotes > 0 ? Math.round((c.vote_count / totalPosVotes) * 100) : 0
      }));

      return {
        id: pos.id,
        name: pos.name,
        description: pos.description,
        totalVotes: totalPosVotes,
        candidates: candidatesWithPct
      };
    });

    return NextResponse.json({
      stats: {
        registeredStudents,
        totalVotesCast,
        uniqueVoters,
        participationRate
      },
      results
    });
  } catch (error) {
    console.error('Fetch results stats error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching voting results' },
      { status: 500 }
    );
  }
}
