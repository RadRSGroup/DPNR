import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';

const COOKIE_NAME = 'csrf_token';

export async function issueCsrfToken() {
  const token = randomBytes(16).toString('hex');
  const c = await cookies();
  c.set(COOKIE_NAME, token, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return token;
}

export async function readCsrfTokenFromCookie() {
  const c = await cookies();
  return c.get(COOKIE_NAME)?.value;
}

export async function validateCsrf(request: Request) {
  const header = request.headers.get('x-csrf-token') || request.headers.get('x-xsrf-token');
  const cookieVal = await readCsrfTokenFromCookie();
  return Boolean(header && cookieVal && header === cookieVal);
}
