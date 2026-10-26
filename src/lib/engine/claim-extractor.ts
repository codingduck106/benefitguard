/**
 * Claim Extractor — Step 2 of the verification pipeline.
 * Uses deterministic pattern matching to identify verifiable claims
 * in a benefits-related message.
 */

import type { RuleId } from '../types';
import type { NormalizedInput } from './normalizer';

export interface ExtractedClaim {
  id: string;
  text: string;
  type: ClaimType;
  confidence: number;
  matchedPatterns: string[];
  rule: RuleId;
  /** Keyword-only match (a bare dollar amount): can prompt a review, never a scam verdict on its own. */
  weak?: boolean;
}

// Confirmations of a payment already made are not payment demands.
const RECEIPT_REGEX = /\b(?:was|were|has\s+been|have\s+been)\s+(?:received|posted|processed|applied)\b|\bthank\s+you\s+for\s+your\s+payment\b|\b(?:recibimos|hemos\s+recibido)\s+su\s+pago\b|\bsu\s+pago\b[^.!?]*\b(?:fue|ha\s+sido)\s+(?:recibido|procesado|aplicado)\b/i;

/** The sentence that contains the given position. */
function sentenceAround(text: string, index: number): string {
  const start = text.slice(0, index).search(/[^.!?\n]*$/);
  const end = text.slice(index).search(/[.!?](?:\s|$)|\n/);
  return text.slice(start, end === -1 ? undefined : index + end);
}

export type ClaimType =
  | 'payment-request'
  | 'sensitive-info-request'
  | 'policy-claim'
  | 'url-reference'
  | 'urgency-threat'
  | 'identity-claim'
  | 'general';

interface ClaimPattern {
  pattern: RegExp;
  type: ClaimType;
  description: string;
  rule: RuleId;
  extractClaim: (match: RegExpMatchArray, fullText: string) => string;
}

const CLAIM_PATTERNS: ClaimPattern[] = [
  // Payment requests
  {
    pattern: /(?:you\s+must\s+pay|pay(?:ment)?\s+(?:of\s+)?\$[\d,.]+|(?:fee|cost|charge)\s+(?:of\s+)?\$[\d,.]+|\$[\d,.]+\s+(?:fee|cost|charge|payment)|pay\s+(?:through|via|at)\s+(?:this\s+)?link|send\s+payment)/gi,
    type: 'payment-request',
    description: 'Payment request detected',
    rule: 'payment-request',
    extractClaim: (match) => match[0].trim(),
  },
  {
    pattern: /(?:processing\s+fee|renewal\s+fee|enrollment\s+fee|application\s+fee|requires?\s+a?\s*\$\d+)/gi,
    type: 'payment-request',
    description: 'Fee claim detected',
    rule: 'fee-claim',
    extractClaim: (match) => match[0].trim(),
  },
  // Payment methods benefits agencies do not use
  {
    pattern: /(?:zelle|cash\s*app|venmo|paypal|gift\s*cards?|tarjetas?\s+de\s+regalo|bitcoin|cryptocurrency|criptomoneda|money\s+order|wire\s+transfer|transferencia|prepaid\s+(?:debit\s+)?card|tarjeta\s+prepagada)/gi,
    type: 'payment-request',
    description: 'Payment method that benefits agencies do not use',
    rule: 'payment-method',
    extractClaim: (match) => match[0].trim(),
  },
  // Sensitive information requests
  {
    pattern: /(?:(?:reply|respond|send|provide|give|submit|enter)\s+(?:with\s+)?(?:your\s+)?(?:(?:EBT\s+)?PIN|social\s+security\s+(?:number)?|SSN|password|passcode|bank\s+account|credit\s+card|card\s+number))/gi,
    type: 'sensitive-info-request',
    description: 'Request for sensitive personal information',
    rule: 'sensitive-request',
    extractClaim: (match) => match[0].trim(),
  },
  // Policy claims about fees
  {
    pattern: /(?:(?:california|state|government|Medi-Cal)\s+requires?\s+(?:a\s+)?\$?\d+(?:\.\d+)?\s+(?:processing\s+)?fee)/gi,
    type: 'policy-claim',
    description: 'Claim about government policy on fees',
    rule: 'fee-policy-claim',
    extractClaim: (match) => match[0].trim(),
  },
  {
    pattern: /(?:Medi-Cal\s+(?:renewal|enrollment)\s+(?:is|costs?|requires?|has\s+a)\s+(?:free|\$?\d+))/gi,
    type: 'policy-claim',
    description: 'Claim about Medi-Cal costs',
    rule: 'fee-policy-claim',
    extractClaim: (match) => match[0].trim(),
  },
  // URL references
  {
    pattern: /(?:(?:complete|renew|visit|go\s+to|click|open)\s+(?:your\s+)?(?:renewal\s+)?(?:at|through|via)\s+(?:this\s+)?(?:link)?:?\s*https?:\/\/\S+)/gi,
    type: 'url-reference',
    description: 'Directing user to a specific URL',
    rule: 'link-in-message',
    extractClaim: (match) => match[0].trim(),
  },
  // Urgency threats
  {
    pattern: /(?:(?:your\s+)?(?:coverage|benefits?)\s+will\s+(?:be\s+)?(?:terminated|cancelled?|ended?|lost|suspended)(?:\s+(?:immediately|today|tomorrow|unless))?)/gi,
    type: 'urgency-threat',
    description: 'Threat of immediate coverage loss',
    rule: 'coverage-threat',
    extractClaim: (match) => match[0].trim(),
  },
  {
    pattern: /(?:failure\s+to\s+(?:submit|pay|respond|comply)\s+will\s+result\s+in\s+(?:automatic\s+)?(?:cancellation|termination|loss))/gi,
    type: 'urgency-threat',
    description: 'Threat of consequences for non-action',
    rule: 'coverage-threat',
    extractClaim: (match) => match[0].trim(),
  },
  // Identity claims
  {
    pattern: /(?:this\s+is\s+(?:the\s+)?(?:official|your)\s+(?:government|state|california|Medi-Cal)\s+(?:renewal\s+)?(?:portal|website|department|office|agency))/gi,
    type: 'identity-claim',
    description: 'Claims to be an official government entity',
    rule: 'agency-claim',
    extractClaim: (match) => match[0].trim(),
  },
  {
    pattern: /(?:(?:from|sent\s+by)\s+(?:the\s+)?(?:california|state)\s+(?:benefits?|health)\s+(?:department|services?|agency))/gi,
    type: 'identity-claim',
    description: 'Claims to be from a specific government agency',
    rule: 'agency-claim',
    extractClaim: (match) => match[0].trim(),
  },
  // "required security check" type phrases
  {
    pattern: /(?:required\s+(?:security\s+)?(?:check|verification|update))/gi,
    type: 'identity-claim',
    description: 'Claims to be a required security process',
    rule: 'security-check',
    extractClaim: (match) => match[0].trim(),
  },
];

export function extractClaims(
  normalizedInput: NormalizedInput
): ExtractedClaim[] {
  const claims: ExtractedClaim[] = [];
  const seenClaims = new Set<string>();
  let claimIndex = 0;

  const { normalizedText, extractedUrls, hasSensitiveInfoRequest, sensitiveInfoTypes, extractedMoneyAmounts } = normalizedInput;

  // Pattern-based claim extraction
  for (const claimPattern of CLAIM_PATTERNS) {
    const regex = new RegExp(claimPattern.pattern.source, claimPattern.pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(normalizedText)) !== null) {
      if (claimPattern.type === 'payment-request' && RECEIPT_REGEX.test(sentenceAround(normalizedText, match.index))) {
        continue;
      }
      const claimText = claimPattern.extractClaim(match, normalizedText);
      const normalizedClaim = claimText.toLowerCase().trim();

      if (!seenClaims.has(normalizedClaim) && claimText.length > 3) {
        seenClaims.add(normalizedClaim);
        claims.push({
          id: `claim-${claimIndex++}`,
          text: claimText,
          type: claimPattern.type,
          confidence: 0.9,
          matchedPatterns: [claimPattern.description],
          rule: claimPattern.rule,
        });
      }
    }
  }

  // Add synthetic claims for sensitive info requests found in normalizer
  if (hasSensitiveInfoRequest && sensitiveInfoTypes.length > 0) {
    const sensitiveClaimText = `Request for sensitive information: ${sensitiveInfoTypes.join(', ')}`;
    if (!seenClaims.has(sensitiveClaimText.toLowerCase())) {
      seenClaims.add(sensitiveClaimText.toLowerCase());
      claims.push({
        id: `claim-${claimIndex++}`,
        text: sensitiveClaimText,
        type: 'sensitive-info-request',
        confidence: 0.95,
        matchedPatterns: ['Sensitive information request detected by normalizer'],
        rule: 'sensitive-info',
      });
    }
  }

  // Add synthetic claims for extracted URLs
  for (const url of extractedUrls) {
    const urlClaim = `Message directs to URL: ${url}`;
    if (!seenClaims.has(urlClaim.toLowerCase())) {
      seenClaims.add(urlClaim.toLowerCase());
      claims.push({
        id: `claim-${claimIndex++}`,
        text: urlClaim,
        type: 'url-reference',
        confidence: 1.0,
        matchedPatterns: ['URL extracted from message'],
        rule: 'link-in-message',
      });
    }
  }

  // Add synthetic claims for money amounts with context
  if (extractedMoneyAmounts.length > 0) {
    // Check if we already captured a payment-related claim
    const hasPaymentClaim = claims.some((c) => c.type === 'payment-request');
    // Share of cost and plan premiums are real charges, so an amount alone is not a scam indicator.
    const isKnownCharge = /share\s+of\s+cost|parte\s+del\s+costo|premium|prima\s+mensual/i.test(normalizedText);
    if (!hasPaymentClaim && !isKnownCharge && !RECEIPT_REGEX.test(normalizedText)) {
      const moneyClaim = `Message references monetary amount: ${extractedMoneyAmounts.join(', ')}`;
      claims.push({
        id: `claim-${claimIndex++}`,
        text: moneyClaim,
        type: 'payment-request',
        confidence: 0.7,
        matchedPatterns: ['Monetary amount detected'],
        rule: 'money-amount',
        weak: true,
      });
    }
  }

  return claims;
}
