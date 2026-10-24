/**
 * Ollama provider — runs a local or self-hosted model. Message text never leaves
 * the machine that hosts Ollama. Uses Ollama's JSON-schema structured output.
 */

import { z } from 'zod';
import { AdvisorOutputSchema } from '../schema';
import type { AdvisorProvider } from './types';

export function createOllamaProvider(): AdvisorProvider {
  const baseUrl = process.env.OLLAMA_URL ?? 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL ?? 'llama3';

  return {
    name: 'ollama',
    model,
    async assess(system, user, signal) {
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          model,
          stream: false,
          format: z.toJSONSchema(AdvisorOutputSchema),
          options: { temperature: 0 },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      });
      if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
      const data = await res.json();
      return AdvisorOutputSchema.parse(JSON.parse(data.message?.content ?? ''));
    },
  };
}
