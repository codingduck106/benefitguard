/**
 * Knowledge Base Matcher — Step 3 of the verification pipeline.
 * Matches extracted claims against the official knowledge base.
 */

import type { OfficialSource, Finding, EvidenceStatus } from '../types';
import type { ExtractedClaim } from './claim-extractor';
import { getAllSources } from '../data-access';

interface ClaimMatchResult {
  claim: ExtractedClaim;
  matchedSources: OfficialSource[];
  evidenceStatus: EvidenceStatus;
  bestMatch?: OfficialSource;
  reason: string;
  evidenceStrength: 'strong' | 'moderate' | 'weak' | 'none';
}

/**
 * Calculate a keyword-matching score between a claim and a source.
 */
function calculateMatchScore(claim: ExtractedClaim, source: OfficialSource): number {
  const claimLower = claim.text.toLowerCase();
  let score = 0;

  for (const keyword of source.keywords) {
    if (claimLower.includes(keyword.toLowerCase())) {
      score += 1;
    }
  }

  // Bonus for topic relevance
  if (
    claimLower.includes('renewal') &&
    source.topic.toLowerCase().includes('renewal')
  ) {
    score += 2;
  }
  if (
    claimLower.includes('fee') ||
    claimLower.includes('pay') ||
    claimLower.includes('$')
  ) {
    if (source.policyStatement.toLowerCase().includes('fee') ||
        source.policyStatement.toLowerCase().includes('free') ||
        source.policyStatement.toLowerCase().includes('charge')) {
      score += 3;
    }
  }
  if (
    (claimLower.includes('pin') || claimLower.includes('password') || claimLower.includes('social security')) &&
    (source.policyStatement.toLowerCase().includes('pin') ||
     source.policyStatement.toLowerCase().includes('password') ||
     source.policyStatement.toLowerCase().includes('social security'))
  ) {
    score += 3;
  }

  return score;
}

/**
 * Determine the evidence status based on claim type and matched source.
 */
function determineEvidenceStatus(
  claim: ExtractedClaim,
  bestSource: OfficialSource | undefined
): { status: EvidenceStatus; reason: string; strength: 'strong' | 'moderate' | 'weak' | 'none' } {
  // A bare dollar amount is worth checking, but is not evidence of a policy conflict.
  if (claim.weak) {
    return {
      status: 'suspicious',
      reason: 'The message mentions a dollar amount. An amount alone is not a scam sign, since real notices mention premiums and payments. Check what the money is for before paying.',
      strength: 'weak',
    };
  }

  const claimLower = claim.text.toLowerCase();

  // Payment requests for Medi-Cal renewal
  if (claim.type === 'payment-request') {
    if (bestSource && (
      bestSource.policyStatement.toLowerCase().includes('does not charge') ||
      bestSource.policyStatement.toLowerCase().includes('free') ||
      bestSource.policyStatement.toLowerCase().includes('never have to pay')
    )) {
      return {
        status: 'contradicted',
        reason: 'This payment request contradicts the official policy that Medi-Cal renewal is free.',
        strength: 'strong',
      };
    }
    return {
      status: 'suspicious',
      reason: 'Requesting payment for benefits processes that are typically free is a common scam tactic.',
      strength: 'moderate',
    };
  }

  // Sensitive information requests
  if (claim.type === 'sensitive-info-request') {
    if (bestSource && (
      bestSource.policyStatement.toLowerCase().includes('never ask') ||
      bestSource.policyStatement.toLowerCase().includes('will never')
    )) {
      return {
        status: 'contradicted',
        reason: 'Requesting sensitive information via text/email contradicts official agency policy.',
        strength: 'strong',
      };
    }
    return {
      status: 'suspicious',
      reason: 'Requesting sensitive personal information via unsolicited messages is a common scam indicator.',
      strength: 'moderate',
    };
  }

  // Policy claims
  if (claim.type === 'policy-claim') {
    if (bestSource) {
      // Check if the claim conflicts with the source
      const claimMentionsFee =
        claimLower.includes('fee') ||
        claimLower.includes('$') ||
        claimLower.includes('pay') ||
        claimLower.includes('cost') ||
        claimLower.includes('charge');
      const sourceIsFree =
        bestSource.policyStatement.toLowerCase().includes('free') ||
        bestSource.policyStatement.toLowerCase().includes('does not charge') ||
        bestSource.policyStatement.toLowerCase().includes('never have to pay');

      if (claimMentionsFee && sourceIsFree) {
        return {
          status: 'contradicted',
          reason: 'This policy claim directly contradicts verified official guidance.',
          strength: 'strong',
        };
      }
      return {
        status: 'supported',
        reason: 'This claim is consistent with official guidance.',
        strength: 'moderate',
      };
    }
    return {
      status: 'insufficient',
      reason: 'No official source was found to verify or contradict this policy claim.',
      strength: 'none',
    };
  }

  // Urgency threats
  if (claim.type === 'urgency-threat') {
    if (bestSource && bestSource.policyStatement.toLowerCase().includes('time to respond')) {
      return {
        status: 'suspicious',
        reason: 'While legitimate notices may include deadlines, threats of immediate termination without allowing time to respond conflict with standard procedures.',
        strength: 'moderate',
      };
    }
    return {
      status: 'suspicious',
      reason: 'Urgent threats of immediate coverage loss are a common scam tactic, though some legitimate notices do include deadlines.',
      strength: 'weak',
    };
  }

  // Identity claims
  if (claim.type === 'identity-claim') {
    return {
      status: 'insufficient',
      reason: 'Claims about the sender\'s identity cannot be verified through text analysis alone.',
      strength: 'none',
    };
  }

  // URL references are handled separately by the URL analyzer
  if (claim.type === 'url-reference') {
    return {
      status: 'insufficient',
      reason: 'URL verification is performed separately.',
      strength: 'none',
    };
  }

  return {
    status: 'insufficient',
    reason: 'Insufficient information available to verify this claim.',
    strength: 'none',
  };
}

/**
 * Match a single claim against the knowledge base.
 */
function matchClaim(claim: ExtractedClaim): ClaimMatchResult {
  const sources = getAllSources();
  const scores = sources.map((source) => ({
    source,
    score: calculateMatchScore(claim, source),
  }));

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  const bestMatch = scores[0]?.score > 0 ? scores[0].source : undefined;
  const matchedSources = scores
    .filter((s) => s.score > 0)
    .map((s) => s.source);

  const { status, reason, strength } = determineEvidenceStatus(
    claim,
    bestMatch
  );

  return {
    claim,
    matchedSources,
    evidenceStatus: status,
    bestMatch,
    reason,
    evidenceStrength: strength,
  };
}

/**
 * Match all claims against the knowledge base and produce findings.
 */
export function matchClaimsToSources(claims: ExtractedClaim[]): Finding[] {
  // Filter out URL-reference claims (handled by URL analyzer)
  const nonUrlClaims = claims.filter((c) => c.type !== 'url-reference');

  return nonUrlClaims.map((claim) => {
    const result = matchClaim(claim);

    return {
      id: claim.id,
      claim: claim.text,
      reason: result.reason,
      evidenceStatus: result.evidenceStatus,
      officialSource: result.bestMatch
        ? {
            agency: result.bestMatch.agency,
            url: result.bestMatch.sourceUrl,
            policyStatement: result.bestMatch.policyStatement,
            lastVerifiedDate: result.bestMatch.lastVerifiedDate,
            verificationStatus: result.bestMatch.verificationStatus,
          }
        : undefined,
      evidenceStrength: result.evidenceStrength,
      evidenceExplanation: getEvidenceExplanation(result.evidenceStrength),
      recommendedAction: getRecommendedAction(result.evidenceStatus, claim.type),
      recommendedActionEs: getRecommendedActionEs(result.evidenceStatus, claim.type),
      category: getCategoryFromType(claim.type, result.evidenceStatus),
    };
  });
}

function getEvidenceExplanation(strength: 'strong' | 'moderate' | 'weak' | 'none'): string {
  const explanations = {
    strong: 'This finding is directly supported by a verified official source.',
    moderate: 'This finding is consistent with official guidance but is not a direct match.',
    weak: 'This finding is based on general patterns. No specific official source directly addresses this.',
    none: 'No official source is available to verify this claim.',
  };
  return explanations[strength];
}

function getRecommendedAction(status: EvidenceStatus, claimType: string): string {
  if (status === 'contradicted') {
    if (claimType === 'payment-request') {
      return 'Do not make any payment. Medi-Cal renewal is free. If you receive a request for payment, contact your county office directly at the number on your Benefits Identification Card.';
    }
    return 'This claim conflicts with official policy. Contact the agency directly through independently obtained contact information to verify.';
  }
  if (status === 'suspicious') {
    if (claimType === 'sensitive-info-request') {
      return 'Do not share sensitive personal information via text or email. Contact your county office directly using officially published contact information.';
    }
    return 'Exercise caution. Verify this information by contacting the agency directly through independently obtained contact information.';
  }
  if (status === 'supported') {
    return 'This claim is consistent with official guidance, but the sender of this message remains unverified.';
  }
  return 'This claim could not be verified. Contact the agency directly through independently obtained contact information.';
}

function getRecommendedActionEs(status: EvidenceStatus, claimType: string): string {
  if (status === 'contradicted') {
    if (claimType === 'payment-request') {
      return 'No realice ningún pago. La renovación de Medi-Cal es gratuita. Si recibe una solicitud de pago, comuníquese directamente con su oficina del condado al número en su Tarjeta de Identificación de Beneficios.';
    }
    return 'Esta afirmación contradice la política oficial. Comuníquese directamente con la agencia a través de información de contacto obtenida independientemente para verificar.';
  }
  if (status === 'suspicious') {
    if (claimType === 'sensitive-info-request') {
      return 'No comparta información personal confidencial por mensaje de texto o correo electrónico. Comuníquese directamente con su oficina del condado usando información de contacto publicada oficialmente.';
    }
    return 'Tenga precaución. Verifique esta información comunicándose directamente con la agencia a través de información de contacto obtenida independientemente.';
  }
  if (status === 'supported') {
    return 'Esta afirmación es consistente con la guía oficial, pero el remitente de este mensaje sigue sin verificar.';
  }
  return 'Esta afirmación no pudo ser verificada. Comuníquese directamente con la agencia a través de información de contacto obtenida independientemente.';
}

function getCategoryFromType(
  claimType: string,
  evidenceStatus: EvidenceStatus
): 'policy-contradiction' | 'suspicious-indicator' | 'url-analysis' | 'informational' {
  if (evidenceStatus === 'contradicted') return 'policy-contradiction';
  if (evidenceStatus === 'suspicious') return 'suspicious-indicator';
  if (claimType === 'url-reference') return 'url-analysis';
  return 'informational';
}
