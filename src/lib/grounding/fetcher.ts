/**
 * Fetches allowlisted pages only. Server-side use only (refresh script / jobs).
 * Redirects are followed manually and each hop must itself be allowlisted.
 */

import { createHash } from 'node:crypto';
import { isAllowedUrl } from './allowlist';
import type { AllowlistedPage, Snapshot } from './types';

const TIMEOUT_MS = 15_000;
const MAX_BYTES = 2_000_000;
const MAX_REDIRECTS = 3;
const MAX_TEXT_CHARS = 20_000;

export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr|br)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim()
    .slice(0, MAX_TEXT_CHARS);
}

export async function fetchAllowlisted(url: string): Promise<string> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!isAllowedUrl(current)) throw new Error(`Blocked: ${current} is not on the allowlist`);
    const res = await fetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'User-Agent': 'BenefitGuard-Snapshot/1.0', Accept: 'text/html' },
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) throw new Error('Redirect without location');
      current = new URL(location, current).toString();
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!(res.headers.get('content-type') ?? '').includes('text/html')) {
      throw new Error('Unexpected content type');
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) throw new Error('Response too large');
    return new TextDecoder().decode(buf);
  }
  throw new Error('Too many redirects');
}

export async function buildSnapshot(page: AllowlistedPage): Promise<Snapshot> {
  const text = htmlToText(await fetchAllowlisted(page.url));
  if (text.length < 200) throw new Error('Extracted text too short; page may need JavaScript');
  return {
    id: page.id,
    url: page.url,
    agency: page.agency,
    topic: page.topic,
    fetchedAt: new Date().toISOString(),
    contentHash: createHash('sha256').update(text).digest('hex'),
    text,
  };
}
