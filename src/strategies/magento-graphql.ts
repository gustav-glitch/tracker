import type { MagentoGraphqlConfig } from '../types.js';
import type { Strategy, StrategyInput, StrategyResult } from './types.js';

const QUERY = `
  query StockStatus($urlKey: String!) {
    products(filter: { url_key: { eq: $urlKey } }) {
      items {
        name
        stock_status
        custom_attributes {
          attribute_metadata { code }
          selected_attribute_options { attribute_option { label } }
        }
      }
    }
  }
`;

export const magentoGraphql: Strategy<MagentoGraphqlConfig['with']> = {
  name: 'magento-graphql',
  async run(input: StrategyInput<MagentoGraphqlConfig['with']>): Promise<StrategyResult> {
    const { config, fetchFn } = input;

    type Item = {
      name?: string;
      stock_status?: string;
      custom_attributes?: { attribute_metadata: { code: string }; selected_attribute_options: { attribute_option: { label: string }[] | null } }[];
    };
    let data: { data?: { products?: { items?: Item[] } } };
    try {
      const res = await fetchFn(config.graphqlUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ query: QUERY, variables: { urlKey: config.urlKey } }),
      });
      data = (await res.json()) as typeof data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { signal: 'unknown', evidence: `fetch failed: ${msg}` };
    }

    const item = data?.data?.products?.items?.[0];
    if (!item) {
      return { signal: 'unknown', evidence: `no product found for urlKey: ${config.urlKey}` };
    }

    const status = item.stock_status;

    // Check if product has a "not sale before date" restriction (pre-order state)
    const notSaleBefore = item.custom_attributes?.find(a => a.attribute_metadata.code === 'not_sale_before_date');
    const isPreOrder = notSaleBefore?.selected_attribute_options?.attribute_option?.some(o => o.label === 'Ja');
    if (isPreOrder) {
      return { signal: 'out-of-stock', evidence: `stock_status=${status} but not_sale_before_date=Ja (pre-order only)` };
    }

    if (status === 'IN_STOCK') {
      return { signal: 'in-stock', evidence: `stock_status=IN_STOCK` };
    }
    if (status === 'OUT_OF_STOCK') {
      return { signal: 'out-of-stock', evidence: `stock_status=OUT_OF_STOCK` };
    }
    return { signal: 'unknown', evidence: `unexpected stock_status: ${status}` };
  },
};
