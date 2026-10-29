import { NextResponse } from 'next/server';
import { getDb, verifyPassword } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(request) {
  try {
    const { username, identifier, password } = await request.json();
    const loginIdentifier = (identifier || username || '').trim().toLowerCase();

    if (!loginIdentifier || !password) {
      return NextResponse.json(
        { error: 'Username or email and password are required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const user = await db.get(
      'SELECT * FROM users WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE',
      [loginIdentifier, loginIdentifier]
    );

    if (!user || !verifyPassword(password, user.password)) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Create session
    const { token, expiresAt } = await createSession(user.id);

    // Set cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role
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
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during login' },
      { status: 500 }
    );
  }
}
