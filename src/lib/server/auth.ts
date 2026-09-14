import type { RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeBase64url, encodeHexLowerCase } from '@oslojs/encoding';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { env } from '$env/dynamic/private';

const DAY_IN_MS = 1000 * 60 * 60 * 24;

export const sessionCookieName = 'auth-session';

export function generateSessionToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  const token = encodeBase64url(bytes);
  return token;
}

export function generateApiToken() {
  return `hj_${encodeBase64url(crypto.getRandomValues(new Uint8Array(32)))}`;
}

export function hashApiToken(token: string) {
  return encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
}

export async function createApiToken(userId: string, name: string, expiresAt: Date) {
  const token = generateApiToken();
  const record: table.ApiToken = {
    id: encodeBase64url(crypto.getRandomValues(new Uint8Array(12))),
    tokenHash: hashApiToken(token),
    userId,
    name,
    createdAt: new Date(),
    lastUsedAt: null,
    expiresAt,
  };
  await db.insert(table.apiToken).values(record);
  return { token, record };
}

export async function createSession(token: string, userId: string) {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const session: table.Session = {
    id: sessionId,
    userId,
    expiresAt: new Date(Date.now() + DAY_IN_MS * 30),
  };
  await db.insert(table.session).values(session);
  return session;
}

export async function validateSessionToken(token: string) {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const [result] = await db
    .select({
      user: {
        id: table.user.id,
        username: table.user.username,
        canCreate: table.user.canCreate,
        canAdmin: table.user.canAdmin,
      },
      session: table.session,
    })
    .from(table.session)
    .innerJoin(table.user, eq(table.session.userId, table.user.id))
    .where(eq(table.session.id, sessionId));

  if (!result) {
    return { session: null, user: null };
  }
  const { session, user } = result;

  const sessionExpired = Date.now() >= session.expiresAt.getTime();
  if (sessionExpired) {
    await db.delete(table.session).where(eq(table.session.id, session.id));
    return { session: null, user: null };
  }

  const renewSession = Date.now() >= session.expiresAt.getTime() - DAY_IN_MS * 15;
  if (renewSession) {
    session.expiresAt = new Date(Date.now() + DAY_IN_MS * 30);
    await db.update(table.session).set({ expiresAt: session.expiresAt }).where(eq(table.session.id, session.id));
  }

  return { session, user };
}

export type SessionValidationResult = Awaited<ReturnType<typeof validateSessionToken>>;

export async function invalidateSession(sessionId: string) {
  await db.delete(table.session).where(eq(table.session.id, sessionId));
}

function cookieAttributes(event: RequestEvent): {
  path: '/';
  sameSite: 'lax';
  secure: boolean;
} {
  // Secure only when actually served over https (see setSessionTokenCookie).
  // Deletion must mirror these or browsers may keep the cookie.
  return {
    path: '/',
    sameSite: 'lax',
    secure: event.url.protocol === 'https:' || env.ORIGIN?.startsWith('https://') === true,
  };
}

export function setSessionTokenCookie(event: RequestEvent, token: string, expiresAt: Date) {
  // Secure only when actually served over https: a Secure cookie on plain
  // http is silently dropped by browsers (except localhost), which would
  // log users out in a redirect loop. event.url honors ORIGIN /
  // X-Forwarded-Proto, so this tracks the public scheme correctly.
  event.cookies.set(sessionCookieName, token, {
    ...cookieAttributes(event),
    httpOnly: true,
    expires: expiresAt,
  });
}

export function deleteSessionTokenCookie(event: RequestEvent) {
  event.cookies.delete(sessionCookieName, cookieAttributes(event));
}
