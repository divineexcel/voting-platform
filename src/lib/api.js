import { NextResponse } from 'next/server';
import { checkOrigin, AppError } from './security.js';
export function json(data, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
export function endpoint(work) {
  return async request => {
    try {
      if (!['GET','HEAD'].includes(request.method)) checkOrigin(request);
      return await work(request);
    } catch (error) {
      if (error instanceof AppError) return json({ error: error.message, code: error.code }, error.status);
      if (error.code?.startsWith('SQLITE_BUSY')) return json({ error: 'The service is busy. Check your submission status before retrying.', code: 'BUSY' }, 503);
      console.error('request_failed', { code: error.code || error.message?.match(/^[A-Z_]+$/)?.[0] || 'INTERNAL_ERROR' });
      return json({ error: 'We could not complete this request. Please try again or contact your election administrator.', code: 'INTERNAL_ERROR' }, 500);
    }
  };
}
export function sessionCookie(response, token, expiresAt) {
  response.cookies.set('session_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', expires: new Date(expiresAt), path: '/' });
  return response;
}
