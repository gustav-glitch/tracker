import { describe, it, expect } from 'vitest';
import { magentoGraphql } from '../magento-graphql.js';

const base = {
  url: 'https://www.norli.no/some-product',
  html: '',
  config: {
    graphqlUrl: 'https://checkout.norli.no/graphql',
    urlKey: 'pokemon-elite-trainer-box-me04-0196214139954',
  },
};

function stubFetch(body: unknown): typeof fetch {
  return (() =>
    Promise.resolve({ json: () => Promise.resolve(body) })) as unknown as typeof fetch;
}

describe('magento-graphql strategy', () => {
  it('returns in-stock when stock_status is IN_STOCK', async () => {
    const result = await magentoGraphql.run({
      ...base,
      fetchFn: stubFetch({ data: { products: { items: [{ name: 'ETB', stock_status: 'IN_STOCK' }] } } }),
    });
    expect(result.signal).toBe('in-stock');
    expect(result.evidence).toContain('IN_STOCK');
  });

  it('returns out-of-stock when stock_status is OUT_OF_STOCK', async () => {
    const result = await magentoGraphql.run({
      ...base,
      fetchFn: stubFetch({ data: { products: { items: [{ name: 'ETB', stock_status: 'OUT_OF_STOCK' }] } } }),
    });
    expect(result.signal).toBe('out-of-stock');
  });

  it('returns unknown when product not found', async () => {
    const result = await magentoGraphql.run({
      ...base,
      fetchFn: stubFetch({ data: { products: { items: [] } } }),
    });
    expect(result.signal).toBe('unknown');
    expect(result.evidence).toContain('no product found');
  });

  it('returns unknown on fetch error without throwing', async () => {
    const failFetch = (() => Promise.reject(new Error('network error'))) as unknown as typeof fetch;
    const result = await magentoGraphql.run({ ...base, fetchFn: failFetch });
    expect(result.signal).toBe('unknown');
    expect(result.evidence).toContain('fetch failed');
  });
});
