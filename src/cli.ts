import path from 'node:path';
import { loadConfig } from './config.js';
import { runChecks } from './runner.js';
import { loadState, saveState } from './state.js';
import { detectTransitions } from './transitions.js';
import { sendNtfy } from './notifier.js';

async function main() {
  const cfgPath = path.join(process.cwd(), 'trackers.yaml');
  const statePath = path.join(process.cwd(), 'state.json');

  const cfg = await loadConfig(cfgPath);
  const state = await loadState(statePath);
  const results = await runChecks(cfg);

  const cooldown = (id: string) => cfg.trackers.find((t) => t.id === id)?.cooldownMinutes ?? 360;
  const { notifications, nextState } = detectTransitions(state, results, cooldown, new Date());

  await saveState(statePath, nextState);

  const topicFor = (id: string) =>
    cfg.trackers.find((t) => t.id === id)?.ntfyTopic ?? cfg.ntfy.defaultTopic;

  for (const n of notifications) {
    try {
      await sendNtfy(cfg.ntfy.server, topicFor(n.trackerId), n);
      console.log(`notified ${n.trackerId} (${n.signal})`);
    } catch (err) {
      console.error(`failed to notify ${n.trackerId}: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`checked ${results.length}, notified ${notifications.length}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
