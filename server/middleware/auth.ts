import { createError, defineEventHandler, getCookie } from 'h3';
import { isSessionValid, AUTH_COOKIE } from '../utils/auth';
import { PUBLIC_ROUTES, PUBLIC_READ_PREFIXES } from '../utils/constants';

export default defineEventHandler((event) => {
  const path = event.path || '';

  // Always allow nuxt internals and explicit public routes
  if (PUBLIC_ROUTES.has(path) || path.startsWith('/_nuxt')) {
    return;
  }

  if (path.startsWith('/api/')) {
    const token = getCookie(event, AUTH_COOKIE);
    const authenticated = isSessionValid(token);

    // Allow unauthenticated GET requests to public read prefixes.
    // Keyword-only enforcement for public search is handled inside search.get.ts.
    if (!authenticated && event.method === 'GET' && PUBLIC_READ_PREFIXES.some(prefix => path.startsWith(prefix))) {
      return;
    }

    if (!authenticated) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
    }
  }
});
