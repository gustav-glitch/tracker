import { describe, it, expect } from 'vitest';
import { textMatch } from '../text-match.js';

const base = { url: 'https://example.no', fetchFn: fetch };

function run(html: string, config: Parameters<typeof textMatch.run>[0]['config']) {
  return textMatch.run({ ...base, html, config });
}

describe('text-match strategy', () => {
  it('returns in-stock when inStockPattern matches', async () => {
    const result = await run('<p>På lager</p>', { inStockPattern: 'på lager', flags: 'i' });
    expect(result.signal).toBe('in-stock');
    expect(result.evidence).toBeTruthy();
  });

  it('returns out-of-stock when outOfStockPattern matches', async () => {
    const result = await run('<p>Utsolgt</p>', { outOfStockPattern: 'utsolgt', flags: 'i' });
    expect(result.signal).toBe('out-of-stock');
  });

  it('returns unknown when neither pattern matches', async () => {
    const result = await run('<p>Kommende</p>', {
      inStockPattern: 'på lager',
      outOfStockPattern: 'utsolgt',
      flags: 'i',
    });
    expect(result.signal).toBe('unknown');
  });

  it('prefers out-of-stock when both patterns match', async () => {
    const result = await run('<p>Utsolgt, men på lager snart</p>', {
      inStockPattern: 'på lager',
      outOfStockPattern: 'utsolgt',
      flags: 'i',
    });
    expect(result.signal).toBe('out-of-stock');
  });

  it('scopes match to selector when provided', async () => {
    const html = '<div class="stock">På lager</div><p class="other">Utsolgt</p>';
    const result = await run(html, {
      selector: '.stock',
      inStockPattern: 'på lager',
      outOfStockPattern: 'utsolgt',
      flags: 'i',
    });
    expect(result.signal).toBe('in-stock');
  });

  it('truncates evidence to 200 chars', async () => {
    const long = 'på lager ' + 'x'.repeat(300);
    const result = await run(`<p>${long}</p>`, { inStockPattern: 'på lager', flags: 'i' });
    expect(result.signal).toBe('in-stock');
    expect(result.evidence.length).toBeLessThanOrEqual(201);
  });
});
