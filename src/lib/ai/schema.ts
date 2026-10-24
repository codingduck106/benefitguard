/**
 * Structured output the LLM advisor must return. Validated with Zod before use;
 * anything that fails validation is discarded and the app stays rules-only.
 */

import { z } from 'zod';

export const AdvisorCategoryEnum = z.enum([
  'payment-request',
  'sensitive-info-request',
  'urgency-threat',
  'impersonation',
  'suspicious-link',
  'other',
]);
export type AdvisorCategory = z.infer<typeof AdvisorCategoryEnum>;

export const AdvisorFindingSchema = z.object({
  askedAction: z
    .string()
    .describe('What the sender asks the user to do (pay, share a PIN, click a link, ...). Must be a concrete request.'),
  quote: z
    .string()
    .describe('Exact words copied from the message that this finding is about.'),
  category: AdvisorCategoryEnum,
  evidenceStatus: z
    .enum(['contradicted', 'suspicious'])
    .describe('"contradicted" only when a provided official source says otherwise; else "suspicious".'),
  sourceId: z
    .string()
    .nullable()
    .describe('id of the provided official source that supports this finding, or null.'),
  reason: z.string().describe('One or two sentences, in English, explaining the concern.'),
});
export type AdvisorFinding = z.infer<typeof AdvisorFindingSchema>;

export const AdvisorOutputSchema = z.object({
  scamLikelihood: z
    .enum(['low', 'medium', 'high'])
    .describe('Decide this first. "low" unless the sender asks for something risky.'),
  findings: z.array(AdvisorFindingSchema),
  suggestedAssessment: z.enum([
    'scam-indicators',
    'conflicts-found',
    'no-issues',
    'insufficient-info',
  ]),
  explanation: z.string().describe('Plain-language explanation for the user, in English.'),
  explanationEs: z.string().describe('The same explanation in Spanish.'),
});
export type AdvisorOutput = z.infer<typeof AdvisorOutputSchema>;
