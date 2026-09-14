import { api, apiData } from '$lib/server/api';

export const GET = (event) =>
  api(
    async () =>
      apiData({
        name: 'happyjudge API',
        version: '1',
        documentation: '/docs/PROGRAMMATIC_API.md',
        agentInstructions: '/llms.txt',
      }),
    event,
  );
