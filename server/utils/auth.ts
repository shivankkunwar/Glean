import { createHash, timingSafeEqual } from 'node:crypto';

export const AUTH_COOKIE = 'glean_session';

function sha(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function getSessionToken(): string {
  const password = process.env.ADMIN_PASSWORD || 'change-me';
  const explicit = process.env.GLEAN_SESSION_TOKEN;
  return explicit || sha(`glean-session:${password}`);
}

export function verifyPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return false;
  }
  const expectedBytes = Buffer.from(expected, 'utf8');
  const actualBytes = Buffer.from(password, 'utf8');
  if (expectedBytes.length !== actualBytes.length) {
    return false;
  }
  return timingSafeEqual(expectedBytes, actualBytes);
}

export function isSessionValid(token: string | undefined): boolean {
  if (!token) {
    return false;
  }
  return token === getSessionToken();
}
