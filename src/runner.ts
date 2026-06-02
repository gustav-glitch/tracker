import { strategies } from './strategies/index.js';
import { fetchHtml, fetchWithPlaywright } from './fetcher.js';
import type { Config, TrackerConfig } from './types.js';
import type { Signal } from './strategies/types.js';
import type { State } from './state.js';

export type TrackerResult = {
  id: string;
  name: string;
  url: string;
  signal: Signal;
  evidence: string;
  catalogItems?: string[];
  error?: string;
  checkedAt: string;
};

export async function runChecks(
  config: Config,
  deps: { fetchFn?: typeof fetch; state?: State } = {},
): Promise<TrackerResult[]> {
  const fetchFn = deps.fetchFn ?? fetch;
  const state = deps.state;
  const enabled = config.trackers.filter((t) => t.enabled);

  const tasks = enabled.map(async (t): Promise<TrackerResult> => {
    const checkedAt = new Date().toISOString();
    try {
      const html = t.fetchMode === 'playwright'
        ? await fetchWithPlaywright(t.url)
        : await fetchHtml(t.url, fetchFn);
      const strat = strategies[t.strategy];
      const knownItems = state?.trackers[t.id]?.catalogItems;
      const result = await strat.run({
        url: t.url,
        html,
        config: (t as TrackerConfig & { with: Record<string, unknown> }).with as never,
        fetchFn,
        knownItems,
      });
      return { id: t.id, name: t.name, url: t.url, signal: result.signal, evidence: result.evidence, catalogItems: result.catalogItems, checkedAt };
    } catch (err) {
      return {
        id: t.id,
        name: t.name,
        url: t.url,
        signal: 'unknown',
        evidence: '',
        error: err instanceof Error ? err.message : String(err),
        checkedAt,
      };
    }
  });

  return Promise.all(tasks);
}
