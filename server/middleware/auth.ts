import { createError, defineEventHandler, getCookie } from 'h3';
import { isSessionValid, AUTH_COOKIE } from '../utils/auth';

const PUBLIC_ROUTES = new Set([
  '/api/login',
  '/api/logout',
  '/api/session',
  '/api/share',
  '/api/health',
  '/_nuxt',
  '/manifest.webmanifest'
]);

export default defineEventHandler((event) => {
  if (PUBLIC_ROUTES.has(event.path || '') || (event.path?.startsWith('/_nuxt') ?? false)) {
    return;
  }
  if (event.path?.startsWith('/api/') ?? false) {
    const token = getCookie(event, AUTH_COOKIE);
    if (!isSessionValid(token)) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
    }
  }
});
