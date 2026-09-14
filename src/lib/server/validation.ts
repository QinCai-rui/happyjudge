export function parseSamples(raw: string): { input: string; output: string }[] {
  const parsed: unknown = JSON.parse(raw);
  if (
    !Array.isArray(parsed) ||
    parsed.some(
      (sample) =>
        typeof sample !== 'object' ||
        sample === null ||
        typeof (sample as { input?: unknown }).input !== 'string' ||
        typeof (sample as { output?: unknown }).output !== 'string',
    )
  ) {
    throw new Error('bad samples');
  }
  return parsed as { input: string; output: string }[];
}
