# Task: Fetcher and runner orchestration

## Status: done

## Goal
Wire fetching, strategy execution, and a CLI entrypoint together so `tsx src/cli.ts` loads the config, checks every enabled tracker, and prints a structured result list. No state or notifications yet — those come in tasks 05 and 06.

## Done When
- [ ] `src/fetcher.ts` exports `fetchHtml(url: string): Promise<string>` with a realistic User-Agent, 15 s timeout, and one retry on 5xx / network error
- [ ] `src/runner.ts` exports `runChecks(config: Config): Promise<TrackerResult[]>` where `TrackerResult = { id, name, url, signal, evidence, error?, checkedAt }`
- [ ] Disabled trackers are skipped
- [ ] One failing tracker does not prevent others from running (use `Promise.allSettled`)
- [ ] `src/cli.ts` is the entrypoint: loads `trackers.yaml` from `process.cwd()`, runs `runChecks`, prints results as JSON to stdout
- [ ] `npm run check` runs end-to-end against the placeholder config without throwing (placeholder URLs are `enabled: false`, so it just prints an empty array)
- [ ] Tests cover the runner orchestration logic with a stubbed fetcher
- [ ] `npm test` and `npm run typecheck` pass

## Context
Task 4 of 8. Depends on tasks 02 (config) and 03 (strategies). Task 05 will plug state + transitions into the CLI; task 06 plugs notifications. Keep the runner pure (returns data; doesn't perform side effects beyond fetching).

## Files
- Create: `src/fetcher.ts`
- Create: `src/runner.ts`
- Create: `src/cli.ts` (replaces the placeholder `src/index.ts` from task 01 — delete that file if it still exists)
- Create: `src/__tests__/runner.test.ts`

## Approach

### `src/fetcher.ts`
```ts
const USER_AGENT = 'tracker/1.0 (+https://github.com/<user>/tracker)';

export async function fetchHtml(url: string, fetchFn: typeof fetch = fetch): Promise<string> {
  const attempt = async () => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15_000);
    try {
      const res = await fetchFn(url, {
        headers: { 'user-agent': USER_AGENT, 'accept': 'text/html,*/*' },
        signal: ctrl.signal,
        redirect: 'follow',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return await res.text();
    } finally { clearTimeout(t); }
  };
  try { return await attempt(); }
  catch (e) {
    // one retry with a small backoff
    await new Promise(r => setTimeout(r, 1000));
    return await attempt();
  }
}
```
- Take `fetchFn` as an optional parameter so tests can inject a stub.
- Replace `<user>` in the UA with a placeholder; README will tell user to update.

### `src/runner.ts`
```ts
import { strategies } from './strategies/index.js';
import { fetchHtml } from './fetcher.js';
import type { Config } from './types.js';

export type TrackerResult = {
  id: string;
  name: string;
  url: string;
  signal: 'in-stock' | 'out-of-stock' | 'changed' | 'unknown';
  evidence: string;
  error?: string;
  checkedAt: string; // ISO
};

export async function runChecks(
  config: Config,
  deps: { fetchFn?: typeof fetch } = {},
): Promise<TrackerResult[]> {
  const fetchFn = deps.fetchFn ?? fetch;
  const enabled = config.trackers.filter(t => t.enabled);
  const tasks = enabled.map(async (t): Promise<TrackerResult> => {
    const checkedAt = new Date().toISOString();
    try {
      const html = await fetchHtml(t.url, fetchFn);
      const strat = strategies[t.strategy];
      const result = await strat.run({ url: t.url, html, config: (t as any).with, fetchFn });
      return { id: t.id, name: t.name, url: t.url, signal: result.signal, evidence: result.evidence, checkedAt };
    } catch (err) {
      return {
        id: t.id, name: t.name, url: t.url,
        signal: 'unknown',
        evidence: '',
        error: err instanceof Error ? err.message : String(err),
        checkedAt,
      };
    }
  });
  return Promise.all(tasks);
}
```

### `src/cli.ts`
```ts
import path from 'node:path';
import { loadConfig } from './config.js';
import { runChecks } from './runner.js';

async function main() {
  const cfgPath = path.join(process.cwd(), 'trackers.yaml');
  const cfg = await loadConfig(cfgPath);
  const results = await runChecks(cfg);
  console.log(JSON.stringify(results, null, 2));
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
```
Tasks 05 and 06 will extend `main()` with state + notification steps. Keep `runChecks` itself pure.

## Test Expectations
`src/__tests__/runner.test.ts`:
1. Two trackers, both enabled — both invoked.
2. One tracker `enabled: false` — skipped.
3. Fetcher throws for one tracker — that result has `signal: 'unknown'` and `error` set; the other tracker still completes successfully.
4. `checkedAt` is a parseable ISO timestamp.

Inject a stub `fetchFn` via the `deps` argument so no real network calls happen.

## Notes
- Do NOT add state persistence here.
- Do NOT add notifications here.
- Concurrency: `Promise.all` is fine for v1. If we ever watch >50 sites we'll add a small concurrency limit, but we don't need it now.
- Do not log anything from `runChecks` itself — the CLI is the only place that prints.
