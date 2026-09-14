import { eq } from 'drizzle-orm';
import { checkRateLimit } from '$lib/server/rate-limit';
import { createApiToken } from '$lib/server/auth';
import { api, apiData, apiError, ApiError, readJson, serializeUser } from '$lib/server/api';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

type Body = { username?: unknown; password?: unknown; name?: unknown };

export const POST = (event) =>
  api(async (event) => {
    let address = 'unknown';
    try {
      address = event.getClientAddress();
    } catch {
      // A proxy may not provide a client address.
    }
    if (!checkRateLimit(`api-auth:${address}`, 20, 60_000))
      return apiError(new ApiError(429, 'Too many attempts, try again later', 'rate_limited'));
    const body = await readJson<Body>(event, 16 * 1024);
    if (typeof body.username !== 'string' || typeof body.password !== 'string')
      throw new ApiError(400, 'username and password are required', 'validation_error');
    const user = await db.query.user.findFirst({ where: eq(table.user.username, body.username) });
    if (!user || !(await Bun.password.verify(body.password, user.passwordHash)))
      throw new ApiError(401, 'Incorrect username or password', 'invalid_credentials');
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 80) : 'API login';
    const issued = await createApiToken(user.id, name, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    return apiData(
      { token: issued.token, tokenType: 'Bearer', expiresAt: issued.record.expiresAt, user: serializeUser(user) },
      201,
    );
  }, event);
