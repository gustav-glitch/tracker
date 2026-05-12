import { describe, it, expect } from 'vitest';
import { selectorAbsence } from '../selector-absence.js';

const base = { url: 'https://example.no', html: '', fetchFn: fetch };

describe('selector-absence strategy', () => {
  it('returns out-of-stock when selector is present', async () => {
    const result = await selectorAbsence.run({
      ...base,
      html: '<div class="sold-out">Utsolgt</div>',
      config: { selector: '.sold-out' },
    });
    expect(result.signal).toBe('out-of-stock');
  });

  it('returns in-stock when selector is absent', async () => {
    const result = await selectorAbsence.run({
      ...base,
      html: '<div class="product">Tilgjengelig</div>',
      config: { selector: '.sold-out' },
    });
    expect(result.signal).toBe('in-stock');
  });
});
