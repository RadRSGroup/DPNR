import type { SessionOptions } from 'iron-session';

export type SessionUser = {
  id: string;
  email: string;
};

export type AppSession = {
  user?: SessionUser;
};

// Dev convenience: ensure password meets 32+ chars requirement locally
const rawPassword = process.env.IRON_SESSION_PASSWORD || 'dev-only-iron-session-secret';
const password = process.env.NODE_ENV === 'production'
  ? rawPassword
  : (rawPassword.length < 32 ? rawPassword.padEnd(32, '_') : rawPassword);

export const sessionOptions: SessionOptions = {
  password,
  cookieName: process.env.IRON_SESSION_COOKIE_NAME || 'dpnr_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
};
