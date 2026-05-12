import { describe, it, expect } from 'vitest';
import { shopifyJson } from '../shopify-json.js';

function stubFetch(body: unknown): typeof fetch {
  return (() =>
    Promise.resolve({
      json: () => Promise.resolve(body),
    })) as unknown as typeof fetch;
}

const base = { html: '', config: {} as Record<string, never> };

describe('shopify-json strategy', () => {
  it('returns in-stock when available is true', async () => {
    const result = await shopifyJson.run({
      ...base,
      url: 'https://cardcenter.no/products/booster-pack',
      fetchFn: stubFetch({ available: true, variants: [{}, {}] }),
    });
    expect(result.signal).toBe('in-stock');
    expect(result.evidence).toContain('available=true');
    expect(result.evidence).toContain('variants=2');
  });

  it('returns out-of-stock when available is false', async () => {
    const result = await shopifyJson.run({
      ...base,
      url: 'https://cardcenter.no/products/booster-pack',
      fetchFn: stubFetch({ available: false }),
    });
    expect(result.signal).toBe('out-of-stock');
  });

  it('returns unknown on fetch error without throwing', async () => {
    const failFetch = (() => Promise.reject(new Error('network error'))) as unknown as typeof fetch;
    const result = await shopifyJson.run({
      ...base,
      url: 'https://cardcenter.no/products/booster-pack',
      fetchFn: failFetch,
    });
    expect(result.signal).toBe('unknown');
    expect(result.evidence).toContain('fetch failed');
  });

  it('returns unknown for non-product URLs', async () => {
    const result = await shopifyJson.run({
      ...base,
      url: 'https://cardcenter.no/collections/all',
      fetchFn: stubFetch({}),
    });
    expect(result.signal).toBe('unknown');
    expect(result.evidence).toContain('not a Shopify product URL');
  });

  it('appends .js to product URL', async () => {
    let calledUrl = '';
    const captureFetch = ((url: string) => {
      calledUrl = url;
      return Promise.resolve({ json: () => Promise.resolve({ available: true }) });
    }) as unknown as typeof fetch;

    await shopifyJson.run({
      ...base,
      url: 'https://cardcenter.no/products/booster-pack?variant=123',
      fetchFn: captureFetch,
    });
    expect(calledUrl).toBe('https://cardcenter.no/products/booster-pack.js');
  });
});
