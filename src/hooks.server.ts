import type { Handle } from '@sveltejs/kit';
import * as auth from '$lib/server/auth.js';

const handleAuth: Handle = async ({ event, resolve }) => {
  const sessionToken = event.cookies.get(auth.sessionCookieName);

  if (!sessionToken) {
    event.locals.auth = {
      user: null,
      session: null,
    };
    return withSecurityHeaders(await resolve(event));
  }

  const { session, user } = await auth.validateSessionToken(sessionToken);

  if (session) {
    auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
    event.locals.auth = {
      user,
      session,
    };
  } else {
    auth.deleteSessionTokenCookie(event);
    event.locals.auth = {
      user: null,
      session: null,
    };
  }

  return withSecurityHeaders(await resolve(event));
};

/** Baseline hardening headers. Deliberately no full CSP: CodeMirror and
 * SvelteKit hydration need inline scripts/styles that a strict policy
 * would break; revisit with nonces if the frontend threat model grows. */
function withSecurityHeaders(response: Response): Response {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'same-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  return response;
}

export const handle: Handle = handleAuth;
