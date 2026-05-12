import * as cheerio from 'cheerio';
import type { TextMatchConfig } from '../types.js';
import type { Strategy, StrategyInput, StrategyResult } from './types.js';

function truncate(s: string, max = 200): string {
  return s.length > max ? s.slice(0, max) + '…' : s;
}

export const textMatch: Strategy<TextMatchConfig['with']> = {
  name: 'text-match',
  async run(input: StrategyInput<TextMatchConfig['with']>): Promise<StrategyResult> {
    const { html, config } = input;
    const $ = cheerio.load(html);

    const subject = config.selector
      ? $(config.selector).map((_, el) => $(el).text()).get().join(' ')
      : $.text();

    const flags = config.flags ?? 'i';
    const outRe = config.outOfStockPattern ? new RegExp(config.outOfStockPattern, flags) : null;
    const inRe = config.inStockPattern ? new RegExp(config.inStockPattern, flags) : null;

    const outMatch = outRe ? outRe.exec(subject) : null;
    if (outMatch) {
      return { signal: 'out-of-stock', evidence: truncate(outMatch[0]) };
    }

    const inMatch = inRe ? inRe.exec(subject) : null;
    if (inMatch) {
      return { signal: 'in-stock', evidence: truncate(inMatch[0]) };
    }

    return { signal: 'unknown', evidence: truncate(subject.trim().replace(/\s+/g, ' ')) };
  },
};
