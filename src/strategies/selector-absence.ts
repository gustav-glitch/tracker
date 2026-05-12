import * as cheerio from 'cheerio';
import type { SelectorAbsenceConfig } from '../types.js';
import type { Strategy, StrategyInput, StrategyResult } from './types.js';

export const selectorAbsence: Strategy<SelectorAbsenceConfig['with']> = {
  name: 'selector-absence',
  async run(input: StrategyInput<SelectorAbsenceConfig['with']>): Promise<StrategyResult> {
    const { html, config } = input;
    const $ = cheerio.load(html);
    const count = $(config.selector).length;

    if (count === 0) {
      return { signal: 'in-stock', evidence: `selector absent: ${config.selector}` };
    }
    return { signal: 'out-of-stock', evidence: `selector present ${count}x: ${config.selector}` };
  },
};
