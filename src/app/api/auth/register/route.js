import { NextResponse } from 'next/server';
import { getDb, hashPassword } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(request) {
  try {
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

    const hashedPassword = hashPassword(password);
    const result = await db.run(
      'INSERT INTO users (username, email, password, name, role) VALUES (?, ?, ?, ?, ?)',
      [trimmedUsername, normalizedEmail, hashedPassword, trimmedUsername, 'student']
    );

    const newUserId = result.lastID;
    const { token, expiresAt } = await createSession(newUserId);

    const response = NextResponse.json({
      success: true,
      user: {
        id: newUserId,
        username: trimmedUsername,
        email: normalizedEmail,
        name: trimmedUsername,
        role: 'student'
      }
    });

    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(expiresAt),
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during registration' },
      { status: 500 }
    );
  }
}
