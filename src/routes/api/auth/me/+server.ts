import { api, apiData, requireUser, serializeUser } from '$lib/server/api';

export const GET = (event) => api(async (event) => apiData(serializeUser(await requireUser(event))), event);
