import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function POST(request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'student') {
      return NextResponse.json(
        { error: 'Only students are eligible to cast votes' },
        { status: 403 }
      );
    }

    const { positionId, candidateId } = await request.json();

    if (!positionId || !candidateId) {
      return NextResponse.json(
        { error: 'Position ID and Candidate ID are required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // 1. Check if candidate exists, is approved, and belongs to this position
    const candidate = await db.get(
      'SELECT id, name FROM candidates WHERE id = ? AND position_id = ? AND status = ?',
      [candidateId, positionId, 'approved']
    );

    if (!candidate) {
      return NextResponse.json(
        { error: 'Invalid candidate selected for this position' },
        { status: 400 }
      );
    }

    // 2. Check if student has already voted for this position
    const existingVote = await db.get(
      'SELECT id FROM votes WHERE voter_id = ? AND position_id = ?',
      [user.id, positionId]
    );

    if (existingVote) {
      return NextResponse.json(
        { error: 'You have already voted for a candidate in this position' },
        { status: 400 }
      );
    }

    // 3. Record the vote
    await db.run(
      'INSERT INTO votes (voter_id, position_id, candidate_id) VALUES (?, ?, ?)',
      [user.id, positionId, candidateId]
    );

    return NextResponse.json({
      success: true,
      message: `Successfully voted for ${candidate.name}`
    });
  } catch (error) {
    console.error('Vote casting error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while casting your vote' },
      { status: 500 }
    );
  }
}
