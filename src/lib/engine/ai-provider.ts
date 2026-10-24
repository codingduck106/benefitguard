/**
 * AI Provider Abstraction — Optional LLM integration.
 * Provides plain-language explanations of structured findings.
 * The app works fully in deterministic mode without an API key.
 * 
 * SECURITY:
 * - AI only explains pre-computed findings; it cannot override evidence statuses.
 * - User message text is treated as untrusted data, never as instructions.
 * - API keys are kept server-side only.
 */

import type { VerificationResponse } from '../types';

export interface AIProvider {
  name: string;
  isAvailable: () => boolean;
  generateExplanation: (
    response: VerificationResponse,
    language: 'en' | 'es'
  ) => Promise<string>;
}

/**
 * Deterministic fallback provider — always available.
 * Returns structured explanations based on the verification results.
 */
export const deterministicProvider: AIProvider = {
  name: 'deterministic',
  isAvailable: () => true,
  generateExplanation: async (
    response: VerificationResponse,
    language: 'en' | 'es'
  ) => {
    if (language === 'es') {
      return response.explanationOfResultEs;
    }
    return response.explanationOfResult;
  },
};

/**
 * Get the active AI provider.
 * Returns the deterministic provider if no LLM API key is configured.
 */
export function getAIProvider(): AIProvider {
  // Future: Check for OPENAI_API_KEY, GEMINI_API_KEY, etc.
  // and return an LLM-based provider if available.
  //
  // const apiKey = process.env.LLM_API_KEY;
  // if (apiKey) {
  //   return createLLMProvider(apiKey);
  // }

  return deterministicProvider;
}
