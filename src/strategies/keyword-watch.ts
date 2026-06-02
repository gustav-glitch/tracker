import type { KeywordWatchConfig } from '../types.js';
import type { Strategy, StrategyInput, StrategyResult } from './types.js';

export const keywordWatch: Strategy<KeywordWatchConfig['with']> = {
  name: 'keyword-watch',
  async run(input: StrategyInput<KeywordWatchConfig['with']>): Promise<StrategyResult> {
    const { html, config, knownItems } = input;
    const { keywords } = config;

    const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/gu, '');
    const normalizedHtml = normalize(html);

    const foundKeywords = keywords.filter((kw) => normalizedHtml.includes(normalize(kw)));

    if (foundKeywords.length === 0 && (!knownItems || knownItems.length === 0)) {
      return {
        signal: 'unknown',
        evidence: `none of the ${keywords.length} keywords found on page`,
        catalogItems: [],
      };
    }

    // First run — establish baseline
    if (!knownItems || knownItems.length === 0) {
      return {
        signal: 'out-of-stock',
        evidence: `baseline: found ${foundKeywords.length}/${keywords.length} keywords (${foundKeywords.join(', ') || 'none'})`,
        catalogItems: foundKeywords,
      };
    }

    const knownSet = new Set(knownItems);
    const newKeywords = foundKeywords.filter((kw) => !knownSet.has(kw));

    if (newKeywords.length > 0) {
      return {
        signal: 'changed',
        evidence: `new keywords detected: ${newKeywords.join(', ')}`,
        catalogItems: foundKeywords,
      };
    }

    return {
      signal: 'out-of-stock',
      evidence: `${foundKeywords.length}/${keywords.length} keywords present, none new`,
      catalogItems: foundKeywords,
    };
  },
};
