import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { loadConfig } from './config.js';
import { runChecks } from './runner.js';
import { loadState, saveState } from './state.js';
import { detectTransitions } from './transitions.js';
import { sendNtfy } from './notifier.js';
import type { Notification } from './transitions.js';

async function appendHistory(historyPath: string, entries: Notification[], now: string) {
  let history: unknown[] = [];
  try {
    history = JSON.parse(await readFile(historyPath, 'utf8')) as unknown[];
  } catch { /* no history yet */ }
  for (const n of entries) {
    history.unshift({ ...n, notifiedAt: now });
  }
  // keep last 200 entries
  await writeFile(historyPath, JSON.stringify(history.slice(0, 200), null, 2) + '\n', 'utf8');
}

async function main() {
  const cfgPath = path.join(process.cwd(), 'trackers.yaml');
  const statePath = path.join(process.cwd(), 'state.json');
  const historyPath = path.join(process.cwd(), 'history.json');

  const cfg = await loadConfig(cfgPath);
  const state = await loadState(statePath);
  const results = await runChecks(cfg);

  const cooldown = (id: string) => cfg.trackers.find((t) => t.id === id)?.cooldownMinutes ?? 360;
  const { notifications, nextState } = detectTransitions(state, results, cooldown, new Date());

  await saveState(statePath, nextState);

  const topicFor = (id: string) =>
    cfg.trackers.find((t) => t.id === id)?.ntfyTopic ?? cfg.ntfy.defaultTopic;

  const sent: Notification[] = [];
  for (const n of notifications) {
    try {
      await sendNtfy(cfg.ntfy.server, topicFor(n.trackerId), n);
      sent.push(n);
      console.log(`notified ${n.trackerId} (${n.signal})`);
    } catch (err) {
      console.error(`failed to notify ${n.trackerId}: ${err instanceof Error ? err.message : err}`);
    }
  }

  if (sent.length > 0) {
    await appendHistory(historyPath, sent, new Date().toISOString());
  }

  console.log(`checked ${results.length}, notified ${notifications.length}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
