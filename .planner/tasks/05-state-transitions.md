# Task: State persistence and transition detection

## Status: done

## Goal
Persist per-tracker state in `state.json`, detect signal transitions between runs, and apply per-tracker cooldown so we only emit a notification on a meaningful change.

## Done When
- [ ] `src/state.ts` exports `loadState(path: string): Promise<State>` and `saveState(path: string, state: State): Promise<void>`. If the file doesn't exist, `loadState` returns an empty state.
- [ ] `src/transitions.ts` exports `detectTransitions(prev: State, results: TrackerResult[], cooldownLookup: (id: string) => number, now: Date): { notifications: Notification[]; nextState: State }`
- [ ] A notification fires only when the new signal is `in-stock` or `changed`, AND it differs from the last notified signal, AND the cooldown window since the last notification has elapsed
- [ ] `unknown` results never fire notifications and never overwrite a previously-known signal in state (they update `lastCheckedAt` only)
- [ ] CLI in `src/cli.ts` is updated to: load state → run checks → compute transitions → save state → print the notifications it _would_ send (still no actual ntfy POST until task 06)
- [ ] Tests cover the transition matrix exhaustively (see Test Expectations)
- [ ] `npm test` and `npm run typecheck` pass

## Context
Task 5 of 8. Depends on tasks 02 (config types) and 04 (runner + `TrackerResult`). Task 06 will replace the "print what we would send" step with a real ntfy POST.

The state file is committed back to the repo by the GH Actions workflow (task 07), so its shape needs to be small, stable, and pleasant to read in a diff.

## Files
- Create: `src/state.ts`
- Create: `src/transitions.ts`
- Modify: `src/cli.ts` — add state load/save and transition detection
- Create: `src/__tests__/transitions.test.ts`
- Create: `src/__tests__/state.test.ts`

## Approach

### State shape — `src/state.ts`
```ts
export type TrackerState = {
  lastSignal: 'in-stock' | 'out-of-stock' | 'changed' | 'unknown';
  lastSignalAt: string; // ISO
  lastCheckedAt: string;
  lastNotifiedSignal?: 'in-stock' | 'out-of-stock' | 'changed';
  lastNotifiedAt?: string;
};

export type State = {
  version: 1;
  trackers: Record<string, TrackerState>;
};

export async function loadState(path: string): Promise<State> {
  try {
    const raw = await fs.readFile(path, 'utf8');
    const parsed = JSON.parse(raw);
    // tolerate missing fields, do not throw on schema drift
    return { version: 1, trackers: parsed.trackers ?? {} };
  } catch (e: any) {
    if (e.code === 'ENOENT') return { version: 1, trackers: {} };
    throw e;
  }
}

export async function saveState(path: string, state: State): Promise<void> {
  await fs.writeFile(path, JSON.stringify(state, null, 2) + '\n', 'utf8');
}
```
- Pretty-print and trailing newline so the committed-back diff is small and readable.

### Transition detection — `src/transitions.ts`
```ts
export type Notification = {
  trackerId: string;
  trackerName: string;
  url: string;
  signal: 'in-stock' | 'changed';
  evidence: string;
};

export function detectTransitions(
  prev: State,
  results: TrackerResult[],
  cooldownLookup: (id: string) => number, // minutes
  now: Date,
): { notifications: Notification[]; nextState: State } {
  const next: State = { version: 1, trackers: { ...prev.trackers } };
  const notifications: Notification[] = [];

  for (const r of results) {
    const prevT = prev.trackers[r.id];
    const nowIso = r.checkedAt;
    const isPositive = r.signal === 'in-stock' || r.signal === 'changed';

    if (r.signal === 'unknown') {
      // do not overwrite known signal; just bump lastCheckedAt
      next.trackers[r.id] = {
        ...(prevT ?? { lastSignal: 'unknown', lastSignalAt: nowIso }),
        lastCheckedAt: nowIso,
      };
      continue;
    }

    const signalChanged = !prevT || prevT.lastSignal !== r.signal;

    next.trackers[r.id] = {
      lastSignal: r.signal,
      lastSignalAt: signalChanged ? nowIso : (prevT?.lastSignalAt ?? nowIso),
      lastCheckedAt: nowIso,
      lastNotifiedSignal: prevT?.lastNotifiedSignal,
      lastNotifiedAt: prevT?.lastNotifiedAt,
    };

    if (!isPositive) continue;
    if (prevT?.lastNotifiedSignal === r.signal) {
      // already notified for this signal
      const cooldownMs = cooldownLookup(r.id) * 60_000;
      const since = prevT.lastNotifiedAt
        ? now.getTime() - new Date(prevT.lastNotifiedAt).getTime()
        : Infinity;
      if (since < cooldownMs) continue;
    }

    notifications.push({
      trackerId: r.id,
      trackerName: r.name,
      url: r.url,
      signal: r.signal,
      evidence: r.evidence,
    });
    next.trackers[r.id].lastNotifiedSignal = r.signal;
    next.trackers[r.id].lastNotifiedAt = nowIso;
  }

  return { notifications, nextState: next };
}
```

### `src/cli.ts` (updated)
```ts
import path from 'node:path';
import { loadConfig } from './config.js';
import { runChecks } from './runner.js';
import { loadState, saveState } from './state.js';
import { detectTransitions } from './transitions.js';

async function main() {
  const cfgPath = path.join(process.cwd(), 'trackers.yaml');
  const statePath = path.join(process.cwd(), 'state.json');

  const cfg = await loadConfig(cfgPath);
  const state = await loadState(statePath);
  const results = await runChecks(cfg);

  const cooldown = (id: string) =>
    cfg.trackers.find(t => t.id === id)?.cooldownMinutes ?? 360;

  const { notifications, nextState } = detectTransitions(state, results, cooldown, new Date());
  await saveState(statePath, nextState);

  // Notifications are printed for now; task 06 will POST them to ntfy.
  console.log(JSON.stringify({ results, notifications }, null, 2));
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
```

## Test Expectations

`src/__tests__/transitions.test.ts` — a table-driven matrix:

| prev signal | new signal | prev notified | within cooldown? | should notify? |
|---|---|---|---|---|
| (none)        | in-stock     | (none)    | n/a   | yes |
| out-of-stock  | in-stock     | (none)    | n/a   | yes |
| out-of-stock  | in-stock     | in-stock  | yes   | no  |
| out-of-stock  | in-stock     | in-stock  | no    | yes |
| in-stock      | in-stock     | in-stock  | yes   | no  |
| in-stock      | out-of-stock | in-stock  | n/a   | no (negative transition) |
| (any)         | unknown      | (any)     | n/a   | no, and prev signal is preserved |
| (none)        | changed      | (none)    | n/a   | yes |

Plus state-shape assertions: after a run, `lastCheckedAt` updates for every tracker; `lastSignalAt` only updates when the signal actually changed.

`src/__tests__/state.test.ts`:
- `loadState` on missing file returns empty state (no throw).
- Round-trip: `saveState` then `loadState` returns the same data.

## Notes
- Cooldown is in minutes, integer. Default 360 (6 h).
- We deliberately notify on every check that lands `in-stock` outside cooldown, even if the previous signal was also `in-stock` — this means a long-lasting restock will re-notify every cooldown window. That's the desired behavior; do not silence it without asking.
  - Actually — re-read the matrix: `in-stock → in-stock` within cooldown = no, outside cooldown = yes (because `lastNotifiedSignal === r.signal` triggers the cooldown branch). Confirm this matches the table above.
- Do NOT add a "reset state" CLI flag. If state goes wrong, user deletes `state.json` and the next run rebuilds it.
