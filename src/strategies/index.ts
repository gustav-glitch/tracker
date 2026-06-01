import { textMatch } from './text-match.js';
import { selectorPresence } from './selector-presence.js';
import { selectorAbsence } from './selector-absence.js';
import { shopifyJson } from './shopify-json.js';
import { magentoGraphql } from './magento-graphql.js';
import { catalogWatch } from './catalog-watch.js';

export const strategies = {
  'text-match': textMatch,
  'selector-presence': selectorPresence,
  'selector-absence': selectorAbsence,
  'shopify-json': shopifyJson,
  'magento-graphql': magentoGraphql,
  'catalog-watch': catalogWatch,
} as const;
