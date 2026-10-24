import type { AdvisorOutput } from '../schema';

export interface AdvisorProvider {
  name: 'ollama' | 'claude';
  model: string;
  assess: (system: string, user: string, signal: AbortSignal) => Promise<AdvisorOutput>;
}
