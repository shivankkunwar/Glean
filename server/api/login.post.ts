import { setCookie } from 'h3';
import { defineEventHandler, readBody } from 'h3';
import { verifyPassword, AUTH_COOKIE, getSessionToken } from '../utils/auth';

export default defineEventHandler(async (event) => {
  const body = await readBody<{ password?: string }>(event);
  if (!verifyPassword(body?.password || '')) {
    return {
      statusCode: 401,
      message: 'Invalid password'
    };
  }

  setCookie(event, AUTH_COOKIE, getSessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30
  });

  return { ok: true };
});
