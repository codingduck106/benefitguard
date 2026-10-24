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

/**
 * Check for common lookalike domain patterns.
 */
function detectLookalike(hostname: string): boolean {
  const lowerHostname = hostname.toLowerCase();

  const lookalikeParts = [
    'medi-cal',
    'medical',
    'medic',
    'medicaid',
    'calfresh',
    'ebt',
    'benefits',
    'dhcs',
    'coveredca',
    'benefitscal',
    'healthcare',
    'enrollment',
    'renewal',
  ];

  const suspiciousTlds = ['.xyz', '.top', '.click', '.info', '.online', '.site', '.club'];

  // Check if it contains benefit-related terms but isn't an approved domain
  const containsBenefitTerms = lookalikeParts.some((part) =>
    lowerHostname.includes(part)
  );

  // Check for suspicious TLD
  const hasSuspiciousTld = suspiciousTlds.some((tld) =>
    lowerHostname.endsWith(tld)
  );

  // Check for common lookalike techniques
  const hasNumberSubstitution = /[0-9]/.test(lowerHostname) && containsBenefitTerms;
  const hasExcessiveHyphens = (lowerHostname.match(/-/g) || []).length > 2;
  const hasExampleDomain = lowerHostname.includes('example.');

  return (
    (containsBenefitTerms && !matchApprovedDomain(lowerHostname).matched) ||
    hasSuspiciousTld ||
    (hasNumberSubstitution && !matchApprovedDomain(lowerHostname).matched) ||
    hasExcessiveHyphens ||
    hasExampleDomain
  );
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

  return {
    url: urlString,
    hostname,
    isApproved: false,
    isShortener: false,
    isLookalike: lookalike,
    notes: lookalike
      ? 'This domain is not a verified official government domain and may be designed to look like one. Do not enter personal information on this site.'
      : 'This domain is not on the list of verified official government domains. This does not necessarily mean it is malicious, but its authenticity has not been confirmed.',
  };
}

/**
 * Analyze all URLs found in a message.
 */
export function analyzeUrls(urls: string[]): UrlAnalysisResult[] {
  return urls.map(analyzeUrl);
}
