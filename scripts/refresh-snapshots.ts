/**
 * Refreshes data/snapshots/*.json for allowlisted pages that are due.
 * Usage: npm run snapshots:refresh [-- --force]
 * A failed fetch keeps the previous snapshot; it never writes partial data.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getAllowlistedPages } from '../src/lib/grounding/allowlist';
import { buildSnapshot } from '../src/lib/grounding/fetcher';
import type { Snapshot } from '../src/lib/grounding/types';

const dir = join(process.cwd(), 'data', 'snapshots');
const force = process.argv.includes('--force');

async function main() {
  let failures = 0;
  for (const page of getAllowlistedPages()) {
    const file = join(dir, `${page.id}.json`);
    if (!force && existsSync(file)) {
      const prev: Snapshot = JSON.parse(readFileSync(file, 'utf8'));
      const ageDays = (Date.now() - Date.parse(prev.fetchedAt)) / 86_400_000;
      if (ageDays < page.refreshDays) {
        console.log(`skip    ${page.id} (fresh, ${ageDays.toFixed(1)}d old)`);
        continue;
      }
    }
    try {
      const snap = await buildSnapshot(page);
      writeFileSync(file, JSON.stringify(snap, null, 2) + '\n');
      console.log(`updated ${page.id} (${snap.text.length} chars)`);
    } catch (err) {
      failures++;
      console.error(`FAILED  ${page.id}: ${err instanceof Error ? err.message : err}`);
    }
  }
  process.exit(failures ? 1 : 0);
}

main();
