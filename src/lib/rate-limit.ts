/**
 * In-memory fixed-window rate limits.
 *
 * Best effort: counts live in this server process, so each serverless instance keeps its own,
 * and a restart clears them. For production, back this with a shared store (e.g. Redis) and
 * keep a spend limit on the AI provider account.
 *
 * Holds only a key (e.g. an IP address) and a count, in memory; never logged or stored.
 */

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();
const MAX_KEYS = 10_000;

export interface LimitResult {
  ok: boolean;
  retryAfterSec: number;
}

/** Counts one hit against `key`. `ok` is false once more than `limit` hits fall in the window. */
export function takeToken(key: string, limit: number, windowMs: number, now = Date.now()): LimitResult {
  let w = windows.get(key);
  if (!w || now >= w.resetAt) {
    if (windows.size >= MAX_KEYS) sweep(now);
    w = { count: 0, resetAt: now + windowMs };
    windows.set(key, w);
  }
  w.count += 1;
  return { ok: w.count <= limit, retryAfterSec: Math.ceil((w.resetAt - now) / 1000) };
}

function sweep(now: number) {
  for (const [key, w] of windows) {
    if (now >= w.resetAt) windows.delete(key);
  }
}

/** Best-effort client address from proxy headers (set by Vercel and most hosts). */
export function clientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/** Reads a positive integer from the environment, or returns the default. */
export function envLimit(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}
