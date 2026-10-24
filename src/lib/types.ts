import { z } from 'zod';

// ─── Message Types ───────────────────────────────────────────────────────────

export const MessageTypeEnum = z.enum(['text', 'email', 'letter', 'website']);
export type MessageType = z.infer<typeof MessageTypeEnum>;

export const TopicEnum = z.enum([
  'medi-cal-enrollment',
  'medi-cal-renewal',
  'payment-request',
  'benefit-card',
  'other',
]);
export type Topic = z.infer<typeof TopicEnum>;

// ─── Verification Request ────────────────────────────────────────────────────

export const VerifyRequestSchema = z.object({
  messageContent: z
    .string()
    .min(1, 'Message content is required')
    .max(5000, 'Message must be under 5,000 characters'),
  messageType: MessageTypeEnum,
  topic: TopicEnum,
  url: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  language: z.enum(['en', 'es']).default('en'),
});

export type VerifyRequest = z.infer<typeof VerifyRequestSchema>;

// ─── Evidence Status ─────────────────────────────────────────────────────────

export type EvidenceStatus =
  | 'supported'
  | 'contradicted'
  | 'suspicious'
  | 'insufficient';

// ─── Overall Assessment ──────────────────────────────────────────────────────

export type OverallAssessment =
  | 'scam-indicators'
  | 'conflicts-found'
  | 'no-issues'
  | 'insufficient-info';

// ─── Finding ─────────────────────────────────────────────────────────────────

export interface Finding {
  id: string;
  claim: string;
  reason: string;
  evidenceStatus: EvidenceStatus;
  officialSource?: {
    agency: string;
    url: string;
    policyStatement: string;
    lastVerifiedDate: string;
    verificationStatus: string;
  };
  evidenceStrength: 'strong' | 'moderate' | 'weak' | 'none';
  evidenceExplanation: string;
  recommendedAction: string;
  recommendedActionEs: string;
  category: 'policy-contradiction' | 'suspicious-indicator' | 'url-analysis' | 'informational';
  /** 'ai' when added by the AI advisor; absent for rule-engine findings. */
  origin?: 'rules' | 'ai';
}

// ─── URL Analysis Result ─────────────────────────────────────────────────────

export interface UrlAnalysisResult {
  url: string;
  hostname: string;
  isApproved: boolean;
  isShortener: boolean;
  isLookalike: boolean;
  matchedDomain?: string;
  agency?: string;
  notes: string;
}

// ─── Verification Response ───────────────────────────────────────────────────

export interface VerificationResponse {
  overallAssessment: OverallAssessment;
  summaryTitle: string;
  summaryTitleEs: string;
  summaryDescription: string;
  summaryDescriptionEs: string;
  findings: Finding[];
  urlAnalysis: UrlAnalysisResult[];
  nextSteps: NextStep[];
  explanationOfResult: string;
  explanationOfResultEs: string;
  analyzedAt: string;
  disclaimer: string;
  disclaimerEs: string;
  /** Present only when the AI advisor ran successfully. */
  aiAdvisor?: {
    provider: 'ollama' | 'claude';
    model: string;
    explanation: string;
    explanationEs: string;
    addedFindings: number;
    rejectedFindings: number;
  };
}

// ─── Next Step ───────────────────────────────────────────────────────────────

export interface NextStep {
  action: string;
  actionEs: string;
  description: string;
  descriptionEs: string;
  url?: string;
  priority: 'high' | 'medium' | 'low';
}

// ─── Knowledge Base Types ────────────────────────────────────────────────────

export interface OfficialSource {
  id: string;
  agency: string;
  topic: string;
  sourceUrl: string;
  policyStatement: string;
  keywords: string[];
  effectiveDate: string;
  lastVerifiedDate: string;
  verificationStatus: 'verified' | 'unverified' | 'stale' | 'unavailable';
  limitations: string;
}

export interface KnowledgeBase {
  version: string;
  lastUpdated: string;
  sources: OfficialSource[];
}

// ─── Domain Types ────────────────────────────────────────────────────────────

export interface ApprovedDomain {
  hostname: string;
  agency: string;
  description: string;
  allowSubdomains: boolean;
  lastVerifiedDate: string;
  verificationStatus: string;
}

export interface DomainDatabase {
  version: string;
  lastUpdated: string;
  approvedDomains: ApprovedDomain[];
  urlShorteners: string[];
}

// ─── Sample Message Types ────────────────────────────────────────────────────

export interface SampleMessage {
  id: string;
  label: string;
  labelEs: string;
  messageType: MessageType;
  topic: string;
  content: string;
  description: string;
  expectedOutcome: OverallAssessment;
}
