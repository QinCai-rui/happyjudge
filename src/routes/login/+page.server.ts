import { encodeBase32LowerCase } from '@oslojs/encoding';
import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import * as auth from '$lib/server/auth';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { checkRateLimit } from '$lib/server/rate-limit';
import type { Actions, PageServerLoad } from './$types';

// Brute-force / enumeration throttle (single-process; use shared store for replicas).
const AUTH_LIMIT = 20;
const AUTH_WINDOW_MS = 60_000;

function clientKey(event: Parameters<Actions['login']>[0], scope: string): string | null {
  try {
    return `auth:${scope}:${event.getClientAddress()}`;
  } catch {
    // Do not place requests with an unknown source into a shared bucket.
    return null;
  }
}

/** User lookup that turns infrastructure failure (e.g. unmigrated DB)
 * into a 503 with an actionable server log instead of a cryptic 500. */
async function findUserByUsername(username: string) {
  try {
    return await db.query.user.findFirst({
      where: eq(table.user.username, username),
    });
  } catch (e) {
    console.error(
      'Database query failed. If this is a fresh deploy with "relation does not exist" errors, ' +
        'the schema has not been migrated. Run: docker compose --profile migrate run --rm migrate',
      e,
    );
    throw error(503, 'Service temporarily unavailable');
  }
}

export const load: PageServerLoad = async (event) => {
  if (event.locals.auth.user) {
    return redirect(302, '/');
  }
  return { redirectTo: safeRedirect(event.url.searchParams.get('redirect')) };
};

export const actions: Actions = {
  login: async (event) => {
    const key = clientKey(event, 'login');
    if (!key) return fail(503, { message: 'Unable to determine client address' });
    if (!checkRateLimit(key, AUTH_LIMIT, AUTH_WINDOW_MS)) {
      return fail(429, { message: 'Too many attempts, try again later' });
    }
    const formData = await event.request.formData();
    const username = formData.get('username');
    const password = formData.get('password');
    const redirectTo = safeRedirect(formData.get('redirect')?.toString());

    if (!validateUsername(username)) {
      return fail(400, {
        message: 'Invalid username (min 3, max 20 characters, alphanumeric only)',
      });
    }
    if (!validatePassword(password)) {
      return fail(400, {
        message: 'Invalid password (min 6, max 255 characters)',
      });
    }

    const existingUser = await findUserByUsername(username);

    if (!existingUser) {
      return fail(400, { message: 'Incorrect username or password' });
    }

    const validPassword = await Bun.password.verify(password, existingUser.passwordHash);
    if (!validPassword) {
      return fail(400, { message: 'Incorrect username or password' });
    }

    const sessionToken = auth.generateSessionToken();
    const session = await auth.createSession(sessionToken, existingUser.id);
    auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);

    return redirect(302, redirectTo);
  },
  register: async (event) => {
    const key = clientKey(event, 'register');
    if (!key) return fail(503, { message: 'Unable to determine client address' });
    if (!checkRateLimit(key, AUTH_LIMIT, AUTH_WINDOW_MS)) {
      return fail(429, { message: 'Too many attempts, try again later' });
    }
    const formData = await event.request.formData();
    const username = formData.get('username');
    const password = formData.get('password');
    const redirectTo = safeRedirect(formData.get('redirect')?.toString());

    if (!validateUsername(username)) {
      return fail(400, { message: 'Invalid username' });
    }
    if (!validatePassword(password)) {
      return fail(400, { message: 'Invalid password' });
    }

    // Hash BEFORE the taken-check so response timing doesn't reveal whether
    // a username exists, and report taken names with the same neutral message
    // as malformed ones (usernames aren't shown publicly anywhere).
    const userId = generateUserId();
    const passwordHash = await Bun.password.hash(password, {
      algorithm: 'argon2id',
      memoryCost: 19456,
      timeCost: 2,
    });

    if (await findUserByUsername(username)) {
      return fail(400, { message: 'Invalid username' });
    }

    try {
      await db.insert(table.user).values({ id: userId, username, passwordHash });

      const sessionToken = auth.generateSessionToken();
      const session = await auth.createSession(sessionToken, userId);
      auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
    } catch (e) {
      console.error(
        'Database insert failed. If relations are missing, run: docker compose --profile migrate run --rm migrate',
        e,
      );
      return fail(500, { message: 'An error has occurred' });
    }
    return redirect(302, redirectTo);
  },
};

function generateUserId() {
  // ID with 120 bits of entropy, or about the same as UUID v4.
  const bytes = crypto.getRandomValues(new Uint8Array(15));
  const id = encodeBase32LowerCase(bytes);
  return id;
}

function validateUsername(username: unknown): username is string {
  return (
    typeof username === 'string' && username.length >= 3 && username.length <= 20 && /^[a-z0-9_-]+$/.test(username)
  );
}

function validatePassword(password: unknown): password is string {
  return typeof password === 'string' && password.length >= 6 && password.length <= 255;
}

function safeRedirect(value: string | null | undefined): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}
