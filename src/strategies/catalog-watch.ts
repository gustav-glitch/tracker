import type { CatalogWatchConfig } from '../types.js';
import type { Strategy, StrategyInput, StrategyResult } from './types.js';

type ShopifyProduct = { id: number; handle: string; title: string; published_at: string };

export const catalogWatch: Strategy<CatalogWatchConfig['with']> = {
  name: 'catalog-watch',
  async run(input: StrategyInput<CatalogWatchConfig['with']>): Promise<StrategyResult> {
    const { url, html, config, fetchFn, knownItems } = input;

    let currentItems: string[] = [];

    if (config.type === 'shopify') {
      // Derive /products.json URL from the collection URL
      const base = new URL(url);
      const productsUrl = `${base.origin}/products.json?limit=250`;
      try {
        const res = await fetchFn(productsUrl, { headers: { accept: 'application/json' } });
        const data = await res.json() as { products: ShopifyProduct[] };
        currentItems = (data.products ?? []).map((p) => `${p.handle}::${p.title}`);
      } catch (err) {
        return { signal: 'unknown', evidence: `fetch failed: ${err instanceof Error ? err.message : String(err)}` };
      }
    } else if (config.type === 'sitemap') {
      // sitemap mode: fetch sitemap.xml and filter by itemPattern
      const base = new URL(url);
      const sitemapUrl = `${base.origin}/sitemap.xml`;
      try {
        const res = await fetchFn(sitemapUrl, { headers: { accept: 'application/xml, text/xml' } });
        const xml = await res.text();
        const rawPattern = config.itemPattern ?? base.pathname.replace(/^\//, '');
        const re = new RegExp(`<loc>(https?://[^<]+)</loc>`, 'gi');
        const allUrls = [...xml.matchAll(re)].map((m) => m[1]).filter((m): m is string => !!m);
        // Normalize both URL and pattern: decode, lowercase, strip diacritics so "pokémon" matches "pokemon"
        const normalize = (s: string) => decodeURIComponent(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/gu, '');
        const normPattern = normalize(rawPattern);
        currentItems = [...new Set(allUrls.filter(u => normalize(u).includes(normPattern)))];
      } catch (err) {
        return { signal: 'unknown', evidence: `sitemap fetch failed: ${err instanceof Error ? err.message : String(err)}` };
      }
    } else {
      // html mode: use itemPattern regex to extract items
      const pattern = config.itemPattern;
      if (!pattern) return { signal: 'unknown', evidence: 'itemPattern required for html type' };
      const re = new RegExp(pattern, 'gi');
      const matches = [...html.matchAll(re)].map((m) => m[1] ?? m[0]);
      currentItems = [...new Set(matches)];
    }

    if (currentItems.length === 0) {
      return { signal: 'unknown', evidence: 'no items found on page', catalogItems: [] };
    }

    // First run — establish baseline, don't notify
    if (!knownItems || knownItems.length === 0) {
      return {
        signal: 'out-of-stock',
        evidence: `baseline set: ${currentItems.length} products catalogued`,
        catalogItems: currentItems,
      };
    }

    const knownSet = new Set(knownItems);
    const newItems = currentItems.filter((item) => !knownSet.has(item));

    if (newItems.length > 0) {
      const names = newItems.map((item) => item.split('::')[1] ?? item).join(', ');
      return {
        signal: 'changed',
        evidence: `${newItems.length} new product${newItems.length > 1 ? 's' : ''}: ${names}`,
        catalogItems: currentItems,
      };
    }

    return {
      signal: 'out-of-stock',
      evidence: `${currentItems.length} products, none new`,
      catalogItems: currentItems,
    };
  },
};
