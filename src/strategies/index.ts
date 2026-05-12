import { textMatch } from './text-match.js';
import { selectorPresence } from './selector-presence.js';
import { selectorAbsence } from './selector-absence.js';
import { shopifyJson } from './shopify-json.js';

export const strategies = {
  'text-match': textMatch,
  'selector-presence': selectorPresence,
  'selector-absence': selectorAbsence,
  'shopify-json': shopifyJson,
} as const;
