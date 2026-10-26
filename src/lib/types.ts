import { z } from 'zod';

// ─── Message Types ───────────────────────────────────────────────────────────

export const MessageTypeEnum = z.enum(['text', 'email', 'letter', 'website', 'call', 'social-media']);
export type MessageType = z.infer<typeof MessageTypeEnum>;

export const ProgramEnum = z.enum(['medi-cal', 'health-plan', 'calfresh-ebt', 'medicare', 'other']);
export type Program = z.infer<typeof ProgramEnum>;

export const AlreadyRespondedEnum = z.enum(['no', 'clicked', 'shared-info', 'paid', 'unsure']);
export type AlreadyResponded = z.infer<typeof AlreadyRespondedEnum>;

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
  /** Replaced by `program`; still accepted from older clients and the eval files, and ignored. */
  topic: TopicEnum.optional(),
  program: ProgramEnum.optional(),
  alreadyResponded: AlreadyRespondedEnum.optional(),
  url: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  language: z.enum(['en', 'es']).default('en'),
});

export type VerifyRequest = z.infer<typeof VerifyRequestSchema>;

/** Text in both supported languages. */
export interface Localized {
  en: string;
  es: string;
}

/**
 * The rule behind each finding. Every finding names one, and cites an official source when one
 * applies, so each result can be traced. AI findings use the category derived from their quote.
 */
export type RuleId =
  | 'payment-request'
  | 'fee-claim'
  | 'payment-method'
  | 'fee-policy-claim'
  | 'sensitive-request'
  | 'sensitive-info'
  | 'money-amount'
  | 'coverage-threat'
  | 'agency-claim'
  | 'security-check'
  | 'link-in-message'
  | 'unapproved-link'
  | 'lookalike-link'
  | 'shortened-link'
  | 'have-ready'
  | 'ai-payment-request'
  | 'ai-sensitive-info-request'
  | 'ai-urgency-threat'
  | 'ai-impersonation'
  | 'ai-suspicious-link'
  | 'ai-other';

/**
 * What the user told us about the message. The rules and the AI advisor get the same object.
 * It helps interpret the message and pick next steps; it never overrides what the message says.
 */
export interface MessageContext {
  channel: MessageType;
  program?: Program;
  alreadyResponded?: AlreadyResponded;
}

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
    id: string;
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
  rule: RuleId;
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
  /** For a lookalike: the official address it imitates, when there is one. */
  imitates?: string;
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
  /** Sentences from the message with deadlines or pressure tactics, quoted for the user. */
  pressure: string[];
  /** What the check could not establish, e.g. the sender's identity. */
  uncertainties: Localized[];
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
