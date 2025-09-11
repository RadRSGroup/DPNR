import type { IronSessionOptions } from 'iron-session';

export type SessionUser = {
  id: string;
  email: string;
};

export type AppSession = {
  user?: SessionUser;
};

export const sessionOptions: IronSessionOptions = {
  password: process.env.IRON_SESSION_PASSWORD || 'insecure-password-change-me',
  cookieName: process.env.IRON_SESSION_COOKIE_NAME || 'dpnr_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
};

