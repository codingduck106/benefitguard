/**
 * URL Analyzer — Step 5 of the verification pipeline.
 * Checks URLs against approved government domains.
 * Detects URL shorteners and lookalike domains.
 * 
 * SECURITY: Does not visit URLs or follow redirects.
 */

import type { UrlAnalysisResult } from '../types';
import { getApprovedDomains, getUrlShorteners } from '../data-access';

/**
 * Safely parse a URL without throwing.
 */
function safeParseUrl(urlString: string): URL | null {
  try {
    return new URL(urlString);
  } catch {
    return null;
  }
}

/**
 * Extract the registrable domain from a hostname.
 * e.g., "www.dhcs.ca.gov" -> "ca.gov" (for .gov domains)
 * e.g., "sub.benefitscal.com" -> "benefitscal.com"
 */
function getBaseDomain(hostname: string): string {
  const parts = hostname.split('.');
  // Handle .gov domains (e.g., dhcs.ca.gov -> ca.gov)
  if (parts.length >= 3 && parts[parts.length - 1] === 'gov') {
    return parts.slice(-3).join('.');
  }
  // Standard domains
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }
  return hostname;
}

/**
 * Check if a hostname matches an approved domain.
 */
function matchApprovedDomain(
  hostname: string
): { matched: boolean; domain?: ReturnType<typeof getApprovedDomains>[number] } {
  const approvedDomains = getApprovedDomains();
  const lowerHostname = hostname.toLowerCase();

  for (const domain of approvedDomains) {
    const approvedHostname = domain.hostname.toLowerCase();

    // Exact match
    if (lowerHostname === approvedHostname) {
      return { matched: true, domain };
    }

    // Subdomain match (if allowed)
    if (domain.allowSubdomains && lowerHostname.endsWith('.' + approvedHostname)) {
      return { matched: true, domain };
    }
  }

  return { matched: false };
}

// Benefit program and agency words. In an address that is not on the official list, they suggest
// it is posing as one. "ebt" has to start a word, so "debt" doesn't count.
const BENEFIT_TERMS = /medi-?cal|medicaid|calfresh|calworks|benefits?|dhcs|coveredca|healthcare|enrollment|renewal|(?:^|[.-])ebt/;

/** Undo letter swaps used to fake an address: "rn" for "m", digits for letters. */
function unswap(host: string): string {
  return host.replace(/rn/g, 'm').replace(/vv/g, 'w').replace(/0/g, 'o').replace(/1/g, 'l').replace(/3/g, 'e').replace(/5/g, 's');
}

/** Edits (insert, delete, replace, or swap two neighbors) needed to turn one string into the other. */
function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

interface Lookalike {
  reason: string;
  /** The official address it imitates, when there is one. */
  imitates?: string;
}

/**
 * Check whether an unofficial address imitates an official one.
 * Short official names (ca.gov, ssa.gov) are skipped for spelling checks: real sites such as
 * va.gov differ from them by a single letter.
 */
function detectLookalike(hostname: string): Lookalike | null {
  const host = hostname.toLowerCase().replace(/^www\./, '');

  if (host.split('.').some((label) => label.startsWith('xn--'))) {
    return { reason: 'This address uses letters from other alphabets that can look like ordinary letters.' };
  }

  for (const domain of getApprovedDomains()) {
    const official = domain.hostname.toLowerCase();
    if (official.length < 8) continue;
    const name = official.split('.')[0];
    if (host.includes(official) || (name.length >= 4 && host.includes(name))) {
      return { reason: `This address contains "${name}" but is not ${official}.`, imitates: official };
    }
    const maxEdits = official.length >= 14 ? 2 : 1;
    if (unswap(host) === official || editDistance(host, official) <= maxEdits) {
      return { reason: `This address is spelled almost like ${official}, but it is a different website.`, imitates: official };
    }
  }

  if (BENEFIT_TERMS.test(host)) {
    return { reason: 'This address uses benefit program words but is not an official government website.' };
  }
  return null;
}

/**
 * Check if a hostname is a known URL shortener.
 */
function isUrlShortener(hostname: string): boolean {
  const shorteners = getUrlShorteners();
  const lowerHostname = hostname.toLowerCase();
  return shorteners.some(
    (s) => lowerHostname === s || lowerHostname.endsWith('.' + s)
  );
}

/**
 * Analyze a single URL for safety indicators.
 */
export function analyzeUrl(urlString: string): UrlAnalysisResult {
  const parsed = safeParseUrl(urlString);

  if (!parsed) {
    return {
      url: urlString,
      hostname: 'unparseable',
      isApproved: false,
      isShortener: false,
      isLookalike: false,
      notes: 'This URL could not be parsed. It may be malformed.',
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Check if it's a URL shortener
  const shortener = isUrlShortener(hostname);
  if (shortener) {
    return {
      url: urlString,
      hostname,
      isApproved: false,
      isShortener: true,
      isLookalike: false,
      notes:
        'This URL uses a URL shortener service, which hides the true destination. Official government communications typically use full official domain names.',
    };
  }

  // Check against approved domains
  const { matched, domain } = matchApprovedDomain(hostname);
  if (matched && domain) {
    return {
      url: urlString,
      hostname,
      isApproved: true,
      isShortener: false,
      isLookalike: false,
      matchedDomain: domain.hostname,
      agency: domain.agency,
      notes: `This URL belongs to ${domain.agency} (${domain.hostname}), a verified official domain. Last verified: ${domain.lastVerifiedDate}.`,
    };
  }

  // Check for lookalikes
  const lookalike = detectLookalike(hostname);

  if (lookalike) {
    return {
      url: urlString,
      hostname,
      isApproved: false,
      isShortener: false,
      isLookalike: true,
      imitates: lookalike.imitates,
      notes: `${lookalike.reason} Do not enter personal information on this site.${
        lookalike.imitates ? ` To reach the real site, type ${lookalike.imitates} yourself.` : ''
      }`,
    };
  }

  return {
    url: urlString,
    hostname,
    isApproved: false,
    isShortener: false,
    isLookalike: false,
    notes:
      'This domain is not on the list of verified official government domains. This does not necessarily mean it is malicious, but its authenticity has not been confirmed.',
  };
}

/**
 * Analyze all URLs found in a message.
 */
export function analyzeUrls(urls: string[]): UrlAnalysisResult[] {
  return urls.map(analyzeUrl);
}
