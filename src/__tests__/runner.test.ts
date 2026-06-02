import { describe, it, expect } from 'vitest';
import { runChecks } from '../runner.js';
import type { Config } from '../types.js';

function makeConfig(trackers: Config['trackers']): Config {
  return {
    ntfy: { server: 'https://ntfy.sh', defaultTopic: 'test' },
    trackers,
  };
}

function stubFetch(html: string): typeof fetch {
  return (() =>
    Promise.resolve({
      ok: true,
      text: () => Promise.resolve(html),
    })) as unknown as typeof fetch;
}

function failFetch(message: string): typeof fetch {
  return (() => Promise.reject(new Error(message))) as unknown as typeof fetch;
}

const shopifyTracker = (id: string, enabled = true): Config['trackers'][number] => ({
  id,
  name: `Tracker ${id}`,
  url: `https://example.no/products/${id}`,
  strategy: 'shopify-json' as const,
  with: {},
  enabled,
  cooldownMinutes: 360,
  fetchMode: 'http' as const,
});

describe('runChecks', () => {
  it('runs both enabled trackers', async () => {
    const config = makeConfig([shopifyTracker('a'), shopifyTracker('b')]);
    const fetch = stubFetch(JSON.stringify({ available: true }));
    const results = await runChecks(config, { fetchFn: fetch });
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('skips disabled trackers', async () => {
    const config = makeConfig([shopifyTracker('enabled'), shopifyTracker('disabled', false)]);
    const results = await runChecks(config, { fetchFn: stubFetch('{}') });
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('enabled');
  });

  it('returns unknown with error when one tracker fetch fails, others continue', async () => {
    const config = makeConfig([shopifyTracker('ok'), shopifyTracker('bad')]);
    let call = 0;
    const mixedFetch = ((url: string) => {
      call++;
      if (url.includes('bad')) return Promise.reject(new Error('network down'));
      return Promise.resolve({ ok: true, text: () => Promise.resolve('{}') });
    }) as unknown as typeof fetch;

    const results = await runChecks(config, { fetchFn: mixedFetch });
    expect(results).toHaveLength(2);
    const bad = results.find((r) => r.id === 'bad');
    const ok = results.find((r) => r.id === 'ok');
    expect(bad?.signal).toBe('unknown');
    expect(bad?.error).toContain('network down');
    expect(ok?.signal).toBeDefined();
  });

  it('checkedAt is a parseable ISO timestamp', async () => {
    const config = makeConfig([shopifyTracker('ts')]);
    const results = await runChecks(config, { fetchFn: stubFetch('{}') });
    const ts = results[0]?.checkedAt;
    expect(ts).toBeTruthy();
    expect(isNaN(Date.parse(ts!))).toBe(false);
  });
});
