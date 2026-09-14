// Type safe Codefort client with timeouts, auth, and lazy language loading.
//
// Uses $env/dynamic/private so CODEFORT_URL is read at request time (not baked
// into the build). The language list is fetched lazily and cached — never with
// top-level await — so `vite build` needs no network access.

import { env } from '$env/dynamic/private';

export type CodefortLanguage = { id: string; name: string };

export type CodefortResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
  stats: {
    compile: { realTime: number; stdout: string; stderr: string } | null;
    run: { realTime: number };
  };
};

const LANGUAGES_TIMEOUT_MS = 10_000;
const LANGUAGES_CACHE_TTL_MS = 60_000;
const EXECUTION_RETRY_DELAYS_MS = [250, 500, 1_000, 2_000, 4_000];

let languagesCache: { value: CodefortLanguage[]; at: number } | null = null;
let languagesInflight: Promise<CodefortLanguage[]> | null = null;

function codefortUrl(): string {
  const url = env.CODEFORT_URL;
  if (!url) throw new Error('CODEFORT_URL is not set');
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('CODEFORT_URL must be a valid URL');
  }
  const isComposeEndpoint =
    parsed.protocol === 'http:' && parsed.hostname === 'codefort' && (parsed.port || '3000') === '3000';
  if (parsed.protocol !== 'https:' && !isComposeEndpoint)
    throw new Error('CODEFORT_URL must use HTTPS or the Compose-only http://codefort:3000 endpoint');
  return parsed.toString().replace(/\/$/, '');
}

function authHeaders(): Record<string, string> {
  // Optional bearer auth for Codefort where networks are not fully trusted.
  return env.CODEFORT_TOKEN ? { Authorization: `Bearer ${env.CODEFORT_TOKEN}` } : {};
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, redirect: 'error', signal: controller.signal });
  } catch (e) {
    if (controller.signal.aborted) throw new Error(`Codefort request timed out after ${timeoutMs}ms`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export async function getLanguages(): Promise<CodefortLanguage[]> {
  const now = Date.now();
  if (languagesCache && now - languagesCache.at < LANGUAGES_CACHE_TTL_MS) return languagesCache.value;
  if (languagesInflight) return languagesInflight;

  languagesInflight = (async () => {
    const res = await fetchWithTimeout(
      codefortUrl() + '/v1/languages',
      { headers: authHeaders() },
      LANGUAGES_TIMEOUT_MS,
    );
    if (!res.ok) throw new Error(`Codefort languages request failed: ${res.status}`);
    const data = (await res.json()) as CodefortLanguage[];
    if (!Array.isArray(data)) throw new Error('Codefort returned malformed languages');
    languagesCache = { value: data, at: Date.now() };
    return data;
  })();

  try {
    return await languagesInflight;
  } finally {
    languagesInflight = null;
  }
}

export async function execute(
  language: string,
  code: string,
  stdin: string,
  compileTimeout: number,
  compileMemoryLimit: number,
  runTimeout: number,
  runMemoryLimit: number,
) {
  // Bound the HTTP round-trip: caller budgets + headroom, clamped to sane limits.
  const budget = Math.max(0, compileTimeout) + Math.max(0, runTimeout);
  const timeoutMs = Math.min(Math.max(budget + 15_000, 10_000), 120_000);

  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetchWithTimeout(
        codefortUrl() + '/v1/run',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({
            language,
            code,
            stdin,
            compileTimeout,
            compileMemoryLimit,
            runTimeout,
            runMemoryLimit,
          }),
        },
        timeoutMs,
      );
    } catch (e) {
      throw new Error(`Codefort execution failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (res.ok) {
      const data = (await res.json()) as CodefortResult;
      if (typeof data?.exitCode !== 'number' || typeof data?.stdout !== 'string' || !data?.stats?.run) {
        throw new Error('Codefort returned malformed execution result');
      }
      return data;
    }
    const delay = EXECUTION_RETRY_DELAYS_MS[attempt];
    if ((res.status !== 429 && res.status !== 503) || delay === undefined)
      throw new Error(`Codefort execution failed: HTTP ${res.status}`);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
