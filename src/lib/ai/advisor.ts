/**
 * AI advisor — optional LLM layer on top of the rule engine.
 *
 * SAFETY RULES (enforced in code, not just in the prompt):
 * - The LLM can only ADD findings. It never removes or downgrades a rule finding,
 *   and it never sets the overall verdict; the rule engine derives the verdict
 *   from the combined findings.
 * - Every finding must quote text that actually appears in the message.
 * - "contradicted" requires a sourceId that exists in the knowledge base;
 *   otherwise the finding is downgraded to "suspicious".
 * - Any failure (timeout, bad JSON, refusal, no provider) returns null and the
 *   app falls back to rules-only.
 *
 * Provider is chosen by LLM_PROVIDER: "ollama" | "claude" | unset (disabled).
 */

import type { Finding, OfficialSource, VerificationResponse } from '../types';
import { getAllSources } from '../data-access';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompt';
import type { AdvisorCategory, AdvisorOutput } from './schema';
import type { AdvisorProvider } from './providers/types';
import { createOllamaProvider } from './providers/ollama';
import { createClaudeProvider } from './providers/claude';

const DEFAULT_TIMEOUT_MS = 30_000;

export function getAdvisorProvider(name = process.env.LLM_PROVIDER): AdvisorProvider | null {
  if (name === 'ollama') return createOllamaProvider();
  if (name === 'claude') return createClaudeProvider();
  return null;
}

const ACTIONS: Record<AdvisorCategory, { en: string; es: string }> = {
  'payment-request': {
    en: 'Do not make any payment. Contact your county office using the number on your Benefits Identification Card.',
    es: 'No realice ningún pago. Comuníquese con su oficina del condado usando el número de su Tarjeta de Identificación de Beneficios.',
  },
  'sensitive-info-request': {
    en: 'Do not share your PIN, Social Security number, passwords, or account details in reply to this message.',
    es: 'No comparta su PIN, número de Seguro Social, contraseñas ni datos de cuenta en respuesta a este mensaje.',
  },
  'urgency-threat': {
    en: 'Do not act under pressure. Confirm any deadline directly with your county office.',
    es: 'No actúe bajo presión. Confirme cualquier fecha límite directamente con su oficina del condado.',
  },
  impersonation: {
    en: 'Verify the sender by contacting the agency through contact information you look up yourself.',
    es: 'Verifique al remitente comunicándose con la agencia mediante información de contacto que usted mismo busque.',
  },
  'suspicious-link': {
    en: 'Do not click the link. Type the official website address yourself.',
    es: 'No haga clic en el enlace. Escriba usted mismo la dirección del sitio web oficial.',
  },
  other: {
    en: 'Verify this message directly with the agency before taking any action.',
    es: 'Verifique este mensaje directamente con la agencia antes de tomar cualquier acción.',
  },
};

const LINK_PATTERN = /(https?:\/\/|www\.|[a-z0-9-]+\.(com|net|org|info|gov|ly|co|io|us|me|link|app|site|online|help|xyz|top|click|live|shop|support|biz|cc)\b)/i;
const PAYMENT_WORDS = /\$|dollars?|d[oó]lares|\bpay|\bpag[aeuo]|remit|deposit|dep[oó]sito|\bfee\b|tarifa|zelle|cash\s*app|venmo|gift\s*card|tarjetas?\s+de\s+regalo|bitcoin|money\s+order|wire|transferencia/i;
const SENSITIVE_WORDS = /\bpin\b|password|contrase|social|\bssn\b|code|c[oó]digo|licen[cs]e|licencia|\bbank|banco|card|tarjeta|birth|nacimiento|photo|foto|sign\s+in|log\s*in/i;

/** Small models label categories unreliably, so the category is derived from the quoted text. */
function inferCategory(quote: string, modelCategory: AdvisorCategory): AdvisorCategory {
  if (LINK_PATTERN.test(quote)) return 'suspicious-link';
  if (PAYMENT_WORDS.test(quote)) return 'payment-request';
  if (SENSITIVE_WORDS.test(quote)) return 'sensitive-info-request';
  return modelCategory === 'suspicious-link' ? 'other' : modelCategory;
}

const squash = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

/** Converts validated advisor output into Findings, dropping anything that fails the safety rules. */
export function toFindings(
  output: AdvisorOutput,
  message: string,
  ruleFindings: Finding[],
  sources: OfficialSource[] = getAllSources()
): Finding[] {
  const text = squash(message);
  const existing = ruleFindings.map((f) => squash(f.claim));
  const accepted: Finding[] = [];

  // The model's own judgment gates its findings: "low" means nothing to add.
  if (output.scamLikelihood === 'low') return accepted;

  for (const f of output.findings) {
    const quote = squash(f.quote);
    if (quote.length < 3 || !text.includes(quote)) continue; // hallucinated quote
    if (existing.some((c) => c.includes(quote) || quote.includes(c))) continue; // duplicate
    if (accepted.some((a) => squash(a.claim) === quote)) continue;

    const source = f.sourceId ? sources.find((s) => s.id === f.sourceId) : undefined;
    const status = f.evidenceStatus === 'contradicted' && source ? 'contradicted' : 'suspicious';
    const action = ACTIONS[inferCategory(f.quote, f.category)];

    accepted.push({
      id: `ai-${accepted.length + 1}`,
      claim: f.quote.trim(),
      reason: f.reason,
      evidenceStatus: status,
      officialSource: source && {
        agency: source.agency,
        url: source.sourceUrl,
        policyStatement: source.policyStatement,
        lastVerifiedDate: source.lastVerifiedDate,
        verificationStatus: source.verificationStatus,
      },
      evidenceStrength: source ? 'moderate' : 'weak',
      evidenceExplanation: source
        ? 'Identified by the AI advisor and checked against the cited official source.'
        : 'Identified by the AI advisor from common scam patterns; no official source is cited.',
      recommendedAction: action.en,
      recommendedActionEs: action.es,
      category: status === 'contradicted' ? 'policy-contradiction' : 'suspicious-indicator',
      origin: 'ai',
    });
  }
  return accepted;
}

export interface AdvisorResult {
  findings: Finding[];
  output: AdvisorOutput;
  info: NonNullable<VerificationResponse['aiAdvisor']>;
}

/** Runs the advisor. Returns null when disabled or on any failure. */
export async function runAdvisor(
  message: string,
  ruleFindings: Finding[],
  provider: AdvisorProvider | null = getAdvisorProvider(),
  timeoutMs = Number(process.env.LLM_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS)
): Promise<AdvisorResult | null> {
  if (!provider) return null;
  const sources = getAllSources();
  try {
    const output = await provider.assess(
      SYSTEM_PROMPT,
      buildUserPrompt(message, sources, ruleFindings),
      AbortSignal.timeout(timeoutMs)
    );
    const findings = toFindings(output, message, ruleFindings, sources);
    return {
      findings,
      output,
      info: {
        provider: provider.name,
        model: provider.model,
        explanation: output.explanation,
        explanationEs: output.explanationEs,
        addedFindings: findings.length,
        rejectedFindings: output.findings.length - findings.length,
      },
    };
  } catch (err) {
    // Never log message contents.
    console.error(`AI advisor (${provider.name}) failed:`, err instanceof Error ? err.message : 'unknown');
    return null;
  }
}
