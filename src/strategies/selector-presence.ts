import * as cheerio from 'cheerio';
import type { SelectorPresenceConfig } from '../types.js';
import type { Strategy, StrategyInput, StrategyResult } from './types.js';

export const selectorPresence: Strategy<SelectorPresenceConfig['with']> = {
  name: 'selector-presence',
  async run(input: StrategyInput<SelectorPresenceConfig['with']>): Promise<StrategyResult> {
    const { html, config } = input;
    const $ = cheerio.load(html);
    const matches = $(config.selector);
    const count = matches.length;

    if (count > 0) {
      const first = matches.first().text().trim().slice(0, 200);
      return { signal: 'in-stock', evidence: `selector matched ${count}x: "${first}"` };
    }
    return { signal: 'out-of-stock', evidence: `selector not found: ${config.selector}` };
  },
};
