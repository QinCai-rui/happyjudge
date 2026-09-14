import { encodeBase32LowerCase } from '@oslojs/encoding';
import { eq } from 'drizzle-orm';
import { createApiToken } from '$lib/server/auth';
import { checkRateLimit } from '$lib/server/rate-limit';
import { api, apiData, ApiError, readJson, serializeUser } from '$lib/server/api';
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
      throw new ApiError(429, 'Too many attempts, try again later', 'rate_limited');
    const body = await readJson<Body>(event, 16 * 1024);
    if (typeof body.username !== 'string' || !/^[a-z0-9_-]{3,20}$/.test(body.username))
      throw new ApiError(
        400,
        'Username must be 3-20 lowercase letters, numbers, underscores, or hyphens',
        'validation_error',
      );
    if (typeof body.password !== 'string' || body.password.length < 6 || body.password.length > 255)
      throw new ApiError(400, 'Invalid password', 'validation_error');
    const passwordHash = await Bun.password.hash(body.password, {
      algorithm: 'argon2id',
      memoryCost: 19456,
      timeCost: 2,
    });
    if (await db.query.user.findFirst({ where: eq(table.user.username, body.username) }))
      throw new ApiError(400, 'Invalid username', 'validation_error');
    const userId = encodeBase32LowerCase(crypto.getRandomValues(new Uint8Array(15)));
    try {
      await db.insert(table.user).values({ id: userId, username: body.username, passwordHash });
    } catch {
      // A concurrent registration must not disclose whether the username won.
      throw new ApiError(400, 'Invalid username', 'validation_error');
    }
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 80) : 'API registration';
    const issued = await createApiToken(userId, name, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    return apiData(
      {
        token: issued.token,
        tokenType: 'Bearer',
        expiresAt: issued.record.expiresAt,
        user: serializeUser({ id: userId, username: body.username, canCreate: false, canAdmin: false }),
      },
      201,
    );
  }, event);
