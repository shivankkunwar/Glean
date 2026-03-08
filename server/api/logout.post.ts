import { defineEventHandler, setCookie } from 'h3';
import { AUTH_COOKIE } from '../utils/auth';

export default defineEventHandler((event) => {
  setCookie(event, AUTH_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0
  });
  return { ok: true };
});
