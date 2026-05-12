import { describe, it, expect } from 'vitest';
import { selectorPresence } from '../selector-presence.js';

const base = { url: 'https://example.no', html: '', fetchFn: fetch };

describe('selector-presence strategy', () => {
  it('returns in-stock when selector matches', async () => {
    const result = await selectorPresence.run({
      ...base,
      html: '<button class="add-to-cart">Legg i handlekurv</button>',
      config: { selector: '.add-to-cart' },
    });
    expect(result.signal).toBe('in-stock');
    expect(result.evidence).toContain('1x');
  });

  it('returns out-of-stock when selector absent', async () => {
    const result = await selectorPresence.run({
      ...base,
      html: '<p>Ingen knapp her</p>',
      config: { selector: '.add-to-cart' },
    });
    expect(result.signal).toBe('out-of-stock');
  });

  it('counts multiple matches', async () => {
    const result = await selectorPresence.run({
      ...base,
      html: '<button class="add-to-cart">A</button><button class="add-to-cart">B</button>',
      config: { selector: '.add-to-cart' },
    });
    expect(result.signal).toBe('in-stock');
    expect(result.evidence).toContain('2x');
  });
});
