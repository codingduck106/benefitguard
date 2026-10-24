/**
 * Evaluates BenefitGuard on the held-out synthetic set in data/eval/.
 * Compares rules-only against rules + AI advisor.
 *
 * Usage:
 *   npm run eval                       # rules only
 *   npm run eval -- --provider=ollama  # rules vs rules + Ollama
 *   npm run eval -- --provider=claude  # rules vs rules + Claude (costs money)
 *   npm run eval -- --set=heldout      # score the held-out set (data/eval/heldout-messages.json)
 *
 * "Flagged" means the verdict is scam-indicators or conflicts-found.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { verifyMessage } from '../src/lib/engine/verify';
import { getAdvisorProvider, runAdvisor } from '../src/lib/ai/advisor';
import type { MessageType, OverallAssessment, Topic } from '../src/lib/types';

interface EvalMessage {
  id: string;
  lang: 'en' | 'es';
  label: 'scam' | 'legitimate' | 'ambiguous';
  pattern: string;
  messageType: MessageType;
  topic: Topic;
  content: string;
}

interface Row {
  id: string;
  lang: string;
  label: EvalMessage['label'];
  pattern: string;
  rules: OverallAssessment;
  advised?: OverallAssessment;
  advisorFailed?: boolean;
  added?: number;
  rejected?: number;
  ms?: number;
  advisorOutput?: unknown;
}

const FLAGGED: OverallAssessment[] = ['scam-indicators', 'conflicts-found'];
const flagged = (a?: OverallAssessment) => !!a && FLAGGED.includes(a);
const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(0)}% (${n}/${d})` : 'n/a');

function score(rows: Row[], pick: (r: Row) => OverallAssessment | undefined) {
  const scams = rows.filter((r) => r.label === 'scam');
  const legit = rows.filter((r) => r.label === 'legitimate');
  return {
    scamRecall: pct(scams.filter((r) => flagged(pick(r))).length, scams.length),
    falsePositives: pct(legit.filter((r) => flagged(pick(r))).length, legit.length),
    scamRecallEs: pct(scams.filter((r) => r.lang === 'es' && flagged(pick(r))).length, scams.filter((r) => r.lang === 'es').length),
  };
}

async function main() {
  const providerArg = process.argv.find((a) => a.startsWith('--provider='))?.split('=')[1];
  const provider = providerArg ? getAdvisorProvider(providerArg) : null;
  if (providerArg && !provider) throw new Error(`Unknown provider: ${providerArg}`);

  const setName = process.argv.find((a) => a.startsWith('--set='))?.split('=')[1] ?? 'benefits';
  const data = JSON.parse(readFileSync(join('data', 'eval', `${setName}-messages.json`), 'utf8'));
  const messages: EvalMessage[] = data.messages;
  const rows: Row[] = [];

  for (const m of messages) {
    const request = { messageContent: m.content, messageType: m.messageType, topic: m.topic, url: '', language: m.lang };
    const base = verifyMessage(request);
    const row: Row = { id: m.id, lang: m.lang, label: m.label, pattern: m.pattern, rules: base.overallAssessment };

    if (provider) {
      const start = Date.now();
      const advice = await runAdvisor(m.content, base.findings, provider, 120_000);
      row.ms = Date.now() - start;
      row.advisorFailed = !advice;
      row.added = advice?.findings.length ?? 0;
      row.rejected = advice ? advice.output.findings.length - advice.findings.length : 0;
      row.advised = advice ? verifyMessage(request, advice.findings).overallAssessment : base.overallAssessment;
      row.advisorOutput = advice?.output;
      process.stdout.write(`${m.id} ${row.rules} -> ${row.advised}${row.advisorFailed ? ' (advisor failed)' : ''}\n`);
    }
    rows.push(row);
  }

  console.log('\n== Summary ==');
  console.table({
    'rules only': score(rows, (r) => r.rules),
    ...(provider ? { [`rules + ${provider.name}:${provider.model}`]: score(rows, (r) => r.advised) } : {}),
  });
  if (provider) {
    const failures = rows.filter((r) => r.advisorFailed).length;
    const avgMs = Math.round(rows.reduce((s, r) => s + (r.ms ?? 0), 0) / rows.length);
    console.log(`Advisor failures: ${failures}/${rows.length}, avg latency ${avgMs} ms, findings added ${rows.reduce((s, r) => s + (r.added ?? 0), 0)}, rejected by safety checks ${rows.reduce((s, r) => s + (r.rejected ?? 0), 0)}`);
  }

  const pick = (r: Row) => (provider ? r.advised : r.rules);
  const misses = rows.filter((r) => (r.label === 'scam' && !flagged(pick(r))) || (r.label === 'legitimate' && flagged(pick(r))));
  console.log('\nErrors (final config):');
  for (const r of misses) console.log(`  ${r.id} [${r.lang}] ${r.label}/${r.pattern}: got ${pick(r)}`);
  console.log('\nAmbiguous (not scored):');
  for (const r of rows.filter((x) => x.label === 'ambiguous')) console.log(`  ${r.id} [${r.lang}] ${r.pattern}: rules=${r.rules}${provider ? ` advised=${r.advised}` : ''}`);

  const outDir = join('data', 'eval', 'results');
  mkdirSync(outDir, { recursive: true });
  const file = join(outDir, `${setName}-${provider ? `${provider.name}-${provider.model}` : 'rules'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  writeFileSync(file, JSON.stringify(rows, null, 2) + '\n');
  console.log(`\nSaved ${file}`);
}

main();
