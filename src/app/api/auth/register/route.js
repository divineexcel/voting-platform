import { NextResponse } from 'next/server';
import { getDb, hashPassword } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(request) {
  try {
    const { code, username, password, name } = await request.json();

    if (!code || !username || !password || !name) {
      return NextResponse.json(
        { error: 'All fields (registration code, username, password, and name) are required' },
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

    // 1. Verify and claim the registration code
    const registrationCode = await db.get(
      'SELECT * FROM registration_codes WHERE code = ?',
      [code.trim()]
    );

    if (!registrationCode) {
      return NextResponse.json(
        { error: 'Invalid registration code. Please contact your administrator.' },
        { status: 400 }
      );
    }

    if (registrationCode.used_by_user_id !== null) {
      return NextResponse.json(
        { error: 'This registration code has already been used.' },
        { status: 400 }
      );
    }

    // 2. Check if username is taken
    const userExists = await db.get(
      'SELECT id FROM users WHERE username = ?',
      [trimmedUsername]
    );

    if (userExists) {
      return NextResponse.json(
        { error: 'Username is already taken. Please choose another one.' },
        { status: 400 }
      );
    }

    // 3. Hash password and insert new user
    const hashedPassword = hashPassword(password);
    
    // We transactionally claim code and create user
    await db.run('BEGIN TRANSACTION');

    try {
      const result = await db.run(
        'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
        [trimmedUsername, hashedPassword, name.trim(), 'student']
      );
      
      const newUserId = result.lastID;

      // Mark registration code as used
      await db.run(
        'UPDATE registration_codes SET used_by_user_id = ? WHERE code = ?',
        [newUserId, code.trim()]
      );

      await db.run('COMMIT');

      // 4. Create session and log user in automatically
      const { token, expiresAt } = await createSession(newUserId);

      const response = NextResponse.json({
        success: true,
        user: {
          id: newUserId,
          username: trimmedUsername,
          name: name.trim(),
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
    } catch (dbError) {
      await db.run('ROLLBACK');
      throw dbError;
    }
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during registration' },
      { status: 500 }
    );
  }
}
