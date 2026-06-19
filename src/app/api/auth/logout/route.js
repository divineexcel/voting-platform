import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth';

export async function POST(request) {
  try {
    const tokenCookie = request.cookies.get('session_token');
    
    if (tokenCookie) {
      const token = tokenCookie.value;
      await deleteSession(token);
    }

    const response = NextResponse.json({ success: true });
    
    // Clear cookie
    response.cookies.set('session_token', '', {
      httpOnly: true,
      expires: new Date(0),
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during logout' },
      { status: 500 }
    );
  }
}
