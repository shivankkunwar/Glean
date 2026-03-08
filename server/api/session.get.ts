import { createError, defineEventHandler, getCookie } from 'h3';
import { isSessionValid } from '../utils/auth';
import { AUTH_COOKIE } from '../utils/auth';

export default defineEventHandler((event) => {
  if (!isSessionValid(getCookie(event, AUTH_COOKIE))) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }
  return { authenticated: true };
});
