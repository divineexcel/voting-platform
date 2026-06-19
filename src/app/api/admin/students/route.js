import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: Retrieve all registered student accounts with their details
export async function GET(request) {
  try {
    const user = await getSessionUser(request);
    if (!user || (user.role !== 'admin' && user.role !== 'subadmin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = await getDb();

    // Fetch all users with student role, left-joining registration_codes to show which code they used
    const students = await db.all(
      `SELECT u.id, u.username, u.name, u.password, u.created_at, rc.code as registration_code
       FROM users u
       LEFT JOIN registration_codes rc ON u.id = rc.used_by_user_id
       WHERE u.role = 'student'
       ORDER BY u.created_at DESC`
    );

    return NextResponse.json({ students });
  } catch (error) {
    console.error('Fetch students error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching student registrations' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a student account from the system
export async function DELETE(request) {
  try {
    const user = await getSessionUser(request);
    if (!user || (user.role !== 'admin' && user.role !== 'subadmin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Student user ID is required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Verify user is a student
    const student = await db.get(
      'SELECT id, name FROM users WHERE id = ? AND role = ?',
      [id, 'student']
    );

    if (!student) {
      return NextResponse.json(
        { error: 'Student account not found or is not a student' },
        { status: 404 }
      );
    }

    // Delete student account. Foreign key cascading (ON DELETE CASCADE) will automatically
    // clean up votes, candidate profiles, and set used_by_user_id to NULL in registration_codes.
    await db.run('DELETE FROM users WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: `Student account for ${student.name} was successfully deleted.`
    });
  } catch (error) {
    console.error('Delete student error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while deleting the student account' },
      { status: 500 }
    );
  }
}
