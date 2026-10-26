import { readFileSync } from 'node:fs';
import { verifyMessage } from '../src/lib/engine/verify';
import { getAdvisorProvider, runAdvisor } from '../src/lib/ai/advisor';
const msgs = JSON.parse(readFileSync('data/eval/benefits-messages.json', 'utf8')).messages;
(async () => {
  for (const id of process.argv.slice(2)) {
    const m = msgs.find((x: { id: string }) => x.id === id);
    const base = verifyMessage({ messageContent: m.content, messageType: m.messageType, topic: m.topic, url: '', language: m.lang });
    const a = await runAdvisor(m.content, base.findings, undefined, getAdvisorProvider('ollama'), 120000);
    console.log(id, JSON.stringify(a?.output, null, 1));
  }
})();
