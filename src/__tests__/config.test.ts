import { describe, it, expect } from 'vitest';
import { load } from 'js-yaml';
import { ConfigSchema } from '../config.js';

function parse(yaml: string) {
  return ConfigSchema.safeParse(load(yaml));
}

const BASE_NTFY = `
ntfy:
  defaultTopic: my-tracker
`;

describe('config schema', () => {
  it('parses a valid text-match config and applies defaults', () => {
    const result = parse(`
${BASE_NTFY}
trackers:
  - id: nille-booster
    name: Nille booster
    url: https://www.nille.no/produkt/123
    strategy: text-match
    with:
      inStockPattern: "på lager"
`);
    expect(result.success).toBe(true);
    if (!result.success) return;
    const tracker = result.data.trackers[0];
    expect(tracker?.cooldownMinutes).toBe(360);
    expect(tracker?.enabled).toBe(true);
    expect(result.data.ntfy.server).toBe('https://ntfy.sh');
  });

  it('parses a valid shopify-json config', () => {
    const result = parse(`
${BASE_NTFY}
trackers:
  - id: cardcenter-pack
    name: CardCenter booster pack
    url: https://cardcenter.no/products/booster
    strategy: shopify-json
`);
    expect(result.success).toBe(true);
  });

  it('rejects an unknown strategy', () => {
    const result = parse(`
${BASE_NTFY}
trackers:
  - id: bad-one
    name: Bad
    url: https://example.no/p
    strategy: unknown-strategy
    with: {}
`);
    expect(result.success).toBe(false);
  });

  it('rejects duplicate tracker ids', () => {
    const result = parse(`
${BASE_NTFY}
trackers:
  - id: dupe
    name: First
    url: https://example.no/p1
    strategy: shopify-json
  - id: dupe
    name: Second
    url: https://example.no/p2
    strategy: shopify-json
`);
    expect(result.success).toBe(false);
    if (result.success) return;
    const messages = result.error.issues.map((i) => i.message);
    expect(messages.some((m) => m.includes('duplicate id'))).toBe(true);
  });

  it('rejects text-match with neither inStockPattern nor outOfStockPattern', () => {
    const result = parse(`
${BASE_NTFY}
trackers:
  - id: no-pattern
    name: No pattern
    url: https://example.no/p
    strategy: text-match
    with:
      selector: ".stock"
`);
    expect(result.success).toBe(false);
    if (result.success) return;
    const messages = result.error.issues.map((i) => i.message);
    expect(messages.some((m) => m.includes('at least one of'))).toBe(true);
  });

  it('rejects a tracker with a missing required field', () => {
    const result = parse(`
${BASE_NTFY}
trackers:
  - id: missing-url
    name: Missing URL
    strategy: shopify-json
`);
    expect(result.success).toBe(false);
    if (result.success) return;
    const paths = result.error.issues.map((i) => i.path.join('.'));
    expect(paths.some((p) => p.includes('url'))).toBe(true);
  });
});
