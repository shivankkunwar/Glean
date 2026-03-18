import { createError, defineEventHandler, getCookie } from 'h3';
import { isSessionValid, AUTH_COOKIE } from '../utils/auth';
import { PUBLIC_ROUTES } from '../utils/constants';

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
