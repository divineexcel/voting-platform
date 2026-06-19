import { NextResponse } from 'next/server';
import { getDb, hashPassword } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function POST(request) {
  try {
    const user = await getSessionUser(request);
    
    // Only SUPER admin can create sub-admins
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden. Only the Super Admin can create sub-admins.' },
        { status: 403 }
      );
    }

    const { username, password, name } = await request.json();

    if (!username || !password || !name) {
      return NextResponse.json(
        { error: 'All fields (username, password, and name) are required' },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim().toLowerCase();
    if (trimmedUsername.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters long' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Check if username is taken
    const userExists = await db.get(
      'SELECT id FROM users WHERE username = ?',
      [trimmedUsername]
    );

    if (userExists) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 400 }
      );
    }

    // Hash password and save new subadmin
    const hashedPassword = hashPassword(password);
    
    await db.run(
      'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
      [trimmedUsername, hashedPassword, name.trim(), 'subadmin']
    );

    return NextResponse.json({
      success: true,
      message: `Sub-admin account created successfully for ${name.trim()}.`
    });
  } catch (error) {
    console.error('Create subadmin error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while creating the sub-admin account' },
      { status: 500 }
    );
  }
}
