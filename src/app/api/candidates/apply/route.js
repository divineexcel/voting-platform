import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: Retrieve the logged-in student's applications
export async function GET(request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'student') {
      return NextResponse.json({ applications: [] });
    }

    const db = await getDb();
    
    const applications = await db.all(
      `SELECT c.id, c.name, c.manifesto, c.status, c.created_at, p.name as position_name, p.id as position_id
       FROM candidates c
       JOIN positions p ON c.position_id = p.id
       WHERE c.applied_by_user_id = ?
       ORDER BY c.created_at DESC`,
      [user.id]
    );

    return NextResponse.json({ applications });
  } catch (error) {
    console.error('Fetch applications error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching your applications' },
      { status: 500 }
    );
  }
}

// POST: Submit a new contestant application
export async function POST(request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'student') {
      return NextResponse.json(
        { error: 'Only students are eligible to apply as contestants' },
        { status: 403 }
      );
    }

    const { positionId, manifesto } = await request.json();

    if (!positionId || !manifesto) {
      return NextResponse.json(
        { error: 'Position ID and manifesto are required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // 1. Verify position exists
    const position = await db.get('SELECT id FROM positions WHERE id = ?', [positionId]);
    if (!position) {
      return NextResponse.json(
        { error: 'The specified position does not exist' },
        { status: 400 }
      );
    }

    // 2. Check if student has already applied for this position (approved or pending or rejected)
    const existingApplication = await db.get(
      'SELECT id, status FROM candidates WHERE applied_by_user_id = ? AND position_id = ?',
      [user.id, positionId]
    );

    if (existingApplication) {
      if (existingApplication.status === 'pending') {
        return NextResponse.json(
          { error: 'You already have a pending application for this position' },
          { status: 400 }
        );
      } else if (existingApplication.status === 'approved') {
        return NextResponse.json(
          { error: 'You are already an approved candidate for this position' },
          { status: 400 }
        );
      } else {
        // If rejected, let's allow them to re-apply (or update it), or prevent it.
        // Let's allow updating/resubmitting the application by deleting the rejected one first.
        await db.run('DELETE FROM candidates WHERE id = ?', [existingApplication.id]);
      }
    }

    // 3. Create the application (candidate name matches student user's real name)
    await db.run(
      'INSERT INTO candidates (name, position_id, manifesto, status, applied_by_user_id) VALUES (?, ?, ?, ?, ?)',
      [user.name, positionId, manifesto.trim(), 'pending', user.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Candidacy application submitted successfully. Pending admin review.'
    });
  } catch (error) {
    console.error('Submit application error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while submitting your application' },
      { status: 500 }
    );
  }
}
