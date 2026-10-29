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

    const { email, username, password } = await request.json();

    if (!email || !username || !password) {
      return NextResponse.json(
        { error: 'Email, username, and password are required' },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();
    if (trimmedUsername.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters long' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
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

    // Keep login identifiers unambiguous across the username and email fields.
    const userExists = await db.get(
      `SELECT id FROM users
       WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE
          OR username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE`,
      [trimmedUsername, normalizedEmail, normalizedEmail, trimmedUsername]
    );

    if (userExists) {
      return NextResponse.json(
        { error: 'That email or username is already in use.' },
        { status: 400 }
      );
    }

    // Hash password and save new subadmin
    const hashedPassword = hashPassword(password);
    
    await db.run(
      'INSERT INTO users (username, email, password, name, role) VALUES (?, ?, ?, ?, ?)',
      [trimmedUsername, normalizedEmail, hashedPassword, trimmedUsername, 'subadmin']
    );

    return NextResponse.json({
      success: true,
      message: `Sub-admin account created successfully for ${trimmedUsername}.`
    });
  } catch (error) {
    console.error('Create subadmin error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while creating the sub-admin account' },
      { status: 500 }
    );
  }
}
