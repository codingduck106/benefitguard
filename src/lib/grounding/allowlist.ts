/**
 * The allowlist is the only authority on what the grounding layer may read.
 * Matching is by exact URL (https, same host, same path); a domain match alone is not enough.
 */

import allowlistData from '../../../data/source-allowlist.json';
import type { AllowlistedPage } from './types';

const pages = (allowlistData as { pages: AllowlistedPage[] }).pages;

export function getAllowlistedPages(): AllowlistedPage[] {
  return pages.filter((p) => p.enabled);
}

function normalize(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' || u.username || u.password || u.port) return null;
    return `${u.hostname.toLowerCase()}${u.pathname.replace(/\/+$/, '').toLowerCase()}`;
  } catch {
    return null;
  }
}

export function findAllowlistedPage(url: string): AllowlistedPage | undefined {
  const key = normalize(url);
  if (!key) return undefined;
  return getAllowlistedPages().find((p) => normalize(p.url) === key);
}

export function isAllowedUrl(url: string): boolean {
  return findAllowlistedPage(url) !== undefined;
}
