import { desc, eq } from 'drizzle-orm';
import { createApiToken } from '$lib/server/auth';
import { api, apiData, ApiError, readJson, requireUser } from '$lib/server/api';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

type Body = { name?: unknown; expiresAt?: unknown };

export const GET = (event) =>
  api(async (event) => {
    const user = await requireUser(event);
    const tokens = await db.query.apiToken.findMany({
      where: eq(table.apiToken.userId, user.id),
      orderBy: [desc(table.apiToken.createdAt)],
    });
    return apiData(
      tokens.map(({ id, name, createdAt, lastUsedAt, expiresAt }) => ({ id, name, createdAt, lastUsedAt, expiresAt })),
    );
  }, event);

export const POST = (event) =>
  api(async (event) => {
    const user = await requireUser(event);
    const body = await readJson<Body>(event, 16 * 1024);
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 80) : 'API token';
    if (typeof body.name !== 'undefined' && (typeof body.name !== 'string' || !body.name.trim()))
      throw new ApiError(400, 'name must be a non-empty string', 'validation_error');
    const expiresAt = body.expiresAt
      ? new Date(String(body.expiresAt))
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    if (isNaN(+expiresAt) || expiresAt <= new Date() || expiresAt > new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))
      throw new ApiError(400, 'expiresAt must be within the next 365 days', 'validation_error');
    const issued = await createApiToken(user.id, name, expiresAt);
    return apiData({ token: issued.token, tokenType: 'Bearer', id: issued.record.id, name, expiresAt }, 201);
  }, event);
