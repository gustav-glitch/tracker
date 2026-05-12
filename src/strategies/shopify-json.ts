import type { ShopifyJsonConfig } from '../types.js';
import type { Strategy, StrategyInput, StrategyResult } from './types.js';

function toJsonUrl(url: string): string | null {
  if (url.endsWith('.js')) return url;
  try {
    const u = new URL(url);
    u.search = '';
    u.hash = '';
    const path = u.pathname.replace(/\/$/, '');
    if (!/\/products\/[^/]+$/.test(path)) return null;
    u.pathname = path + '.js';
    return u.toString();
  } catch {
    return null;
  }
}

export const shopifyJson: Strategy<ShopifyJsonConfig['with']> = {
  name: 'shopify-json',
  async run(input: StrategyInput<ShopifyJsonConfig['with']>): Promise<StrategyResult> {
    const { url, fetchFn } = input;
    const jsonUrl = toJsonUrl(url);

    if (!jsonUrl) {
      return { signal: 'unknown', evidence: `not a Shopify product URL: ${url}` };
    }

    let data: { available?: boolean; variants?: unknown[] };
    try {
      const res = await fetchFn(jsonUrl, { headers: { accept: 'application/json' } });
      data = (await res.json()) as typeof data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { signal: 'unknown', evidence: `fetch failed: ${msg}` };
    }

    const variantCount = Array.isArray(data.variants) ? data.variants.length : '?';
    const evidence = `available=${data.available}, variants=${variantCount}`;

    return {
      signal: data.available ? 'in-stock' : 'out-of-stock',
      evidence,
    };
  },
};
