import { strategies } from './strategies/index.js';
import { fetchHtml } from './fetcher.js';
import type { Config, TrackerConfig } from './types.js';
import type { Signal } from './strategies/types.js';

export type TrackerResult = {
  id: string;
  name: string;
  url: string;
  signal: Signal;
  evidence: string;
  error?: string;
  checkedAt: string;
};

export async function runChecks(
  config: Config,
  deps: { fetchFn?: typeof fetch } = {},
): Promise<TrackerResult[]> {
  const fetchFn = deps.fetchFn ?? fetch;
  const enabled = config.trackers.filter((t) => t.enabled);

  const tasks = enabled.map(async (t): Promise<TrackerResult> => {
    const checkedAt = new Date().toISOString();
    try {
      const html = await fetchHtml(t.url, fetchFn);
      const strat = strategies[t.strategy];
      const result = await strat.run({
        url: t.url,
        html,
        config: (t as TrackerConfig & { with: Record<string, unknown> }).with as never,
        fetchFn,
      });
      return { id: t.id, name: t.name, url: t.url, signal: result.signal, evidence: result.evidence, checkedAt };
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
