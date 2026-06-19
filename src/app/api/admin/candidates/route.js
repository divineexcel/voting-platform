import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: Retrieve list of all candidate applications
export async function GET(request) {
  try {
    const user = await getSessionUser(request);
    if (!user || (user.role !== 'admin' && user.role !== 'subadmin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = await getDb();

    const candidates = await db.all(
      `SELECT c.id, c.name, c.manifesto, c.status, c.created_at, p.name as position_name, u.username as applicant_username
       FROM candidates c
       JOIN positions p ON c.position_id = p.id
       JOIN users u ON c.applied_by_user_id = u.id
       ORDER BY 
         CASE WHEN c.status = 'pending' THEN 0 ELSE 1 END,
         c.created_at DESC`
    );

    return NextResponse.json({ candidates });
  } catch (error) {
    console.error('Fetch admin candidates error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching candidate applications' },
      { status: 500 }
    );
  }
}

// POST: Review (approve or reject) a candidate application
export async function POST(request) {
  try {
    const user = await getSessionUser(request);
    if (!user || (user.role !== 'admin' && user.role !== 'subadmin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, status } = await request.json();

    if (!id || !status || (status !== 'approved' && status !== 'rejected' && status !== 'pending')) {
      return NextResponse.json(
        { error: 'Invalid parameters. ID and status (approved/rejected/pending) are required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Verify application exists
    const candidate = await db.get('SELECT id, name, status FROM candidates WHERE id = ?', [id]);
    
    if (!candidate) {
      return NextResponse.json(
        { error: 'Candidate application not found' },
        { status: 404 }
      );
    }

    // Update status
    await db.run(
      'UPDATE candidates SET status = ? WHERE id = ?',
      [status, id]
    );

    return NextResponse.json({
      success: true,
      message: `Candidate ${candidate.name} has been ${status}.`
    });
  } catch (error) {
    console.error('Review candidate error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while reviewing the candidate application' },
      { status: 500 }
    );
  }
}
