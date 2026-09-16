import crypto from 'crypto';
import type { IronSession } from 'iron-session';

const SESSION_COOKIE = 'email-outreach-session';

export interface SessionData {
  user: string | null;
}

function derivePassword(): string {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32) {
    return process.env.SESSION_SECRET;
  }
  const fallback = process.env.APP_PASSWORD || '';
  return crypto.createHash('sha256').update(`email-outreach:${fallback}`).digest('hex');
}

export const sessionOptions = {
  password: derivePassword(),
  cookieName: SESSION_COOKIE,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  },
};

export function verifyCredentials(username: string, password: string): boolean {
  const u = process.env.APP_USERNAME ?? '';
  const p = process.env.APP_PASSWORD ?? '';
  if (!u || !p) return false;

  const userBuf = Buffer.from(username);
  const expectedUser = Buffer.from(u);
  const passBuf = Buffer.from(password);
  const expectedPass = Buffer.from(p);

  if (userBuf.length !== expectedUser.length || passBuf.length !== expectedPass.length) {
    return false;
  }

  return (
    crypto.timingSafeEqual(userBuf, expectedUser) &&
    crypto.timingSafeEqual(passBuf, expectedPass)
  );
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const { cookies } = await import('next/headers');
  const { getIronSession } = await import('iron-session');
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const cookieHeader = allCookies.map((c) => `${c.name}=${c.value}`).join('; ');
  const req = new Request('http://localhost', {
    headers: { cookie: cookieHeader },
  });
  return getIronSession<SessionData>(req, new Response(), sessionOptions);
}

export { SESSION_COOKIE };
