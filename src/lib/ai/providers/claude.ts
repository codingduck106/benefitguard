/**
 * Claude provider — hosted model via the Anthropic API. Message text is sent to
 * Anthropic, so only enable this where that is acceptable.
 * Credentials come from ANTHROPIC_API_KEY (or another SDK credential source).
 */

import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { AdvisorOutputSchema } from '../schema';
import type { AdvisorProvider } from './types';

export function createClaudeProvider(): AdvisorProvider {
  const model = process.env.CLAUDE_MODEL ?? 'claude-opus-5-5';
  const client = new Anthropic({ maxRetries: 1 });

  return {
    name: 'claude',
    model,
    async assess(system, user, signal) {
      const response = await client.beta.messages.parse(
        {
          model,
          max_tokens: 4000,
          // If the model declines, the API retries on a fallback model.
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          output_config: { effort: 'low', format: betaZodOutputFormat(AdvisorOutputSchema) },
          system,
          messages: [{ role: 'user', content: user }],
        },
        { signal }
      );
      if (response.stop_reason === 'refusal') throw new Error('Model declined the request');
      if (!response.parsed_output) throw new Error('No structured output returned');
      return response.parsed_output;
    },
  };
}
