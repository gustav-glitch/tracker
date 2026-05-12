# Task: Detection strategies

## Status: done

## Goal
Implement the four detection strategies behind a uniform interface, each with its own unit test using HTML fixtures.

## Done When
- [ ] `src/strategies/types.ts` exports the `Strategy` interface and `StrategyResult` type
- [ ] Four strategy modules exist: `text-match.ts`, `selector-presence.ts`, `selector-absence.ts`, `shopify-json.ts`
- [ ] `src/strategies/index.ts` exports a registry: `Record<StrategyName, Strategy<any>>`
- [ ] Each strategy has a co-located `*.test.ts` covering at least: in-stock case, out-of-stock case, ambiguous/unknown case
- [ ] All four strategies return `{ signal, evidence }` where `evidence` is a short human-readable snippet (≤200 chars)
- [ ] `npm test` passes

## Context
Task 3 of 8. Depends on task 02 (uses the per-strategy config types from `src/types.ts`). The runner in task 04 will look strategies up by name and call them.

## Files
- Create: `src/strategies/types.ts`
- Create: `src/strategies/text-match.ts`
- Create: `src/strategies/selector-presence.ts`
- Create: `src/strategies/selector-absence.ts`
- Create: `src/strategies/shopify-json.ts`
- Create: `src/strategies/index.ts`
- Create: `src/strategies/__tests__/text-match.test.ts`
- Create: `src/strategies/__tests__/selector-presence.test.ts`
- Create: `src/strategies/__tests__/selector-absence.test.ts`
- Create: `src/strategies/__tests__/shopify-json.test.ts`

## Approach

### Interface — `src/strategies/types.ts`
```ts
export type Signal = 'in-stock' | 'out-of-stock' | 'changed' | 'unknown';

export type StrategyResult = {
  signal: Signal;
  evidence: string; // short snippet, trimmed to 200 chars
};

export type StrategyInput<C> = {
  url: string;
  html: string;
  config: C;
  fetchFn: typeof fetch; // injected so tests can stub
};

export interface Strategy<C> {
  name: string;
  run(input: StrategyInput<C>): Promise<StrategyResult>;
}
```

### `text-match.ts`
- Extract subject text: if `selector` set, join `cheerio` text of all matches; else use full `html`.
- Compile regexes from `inStockPattern` / `outOfStockPattern` with given `flags`.
- Order: out-of-stock match first (more conservative; if both match the page is contradictory and we'd rather not false-fire), then in-stock, then `unknown`.
- Evidence: the matched substring, ≤200 chars.

### `selector-presence.ts`
- `cheerio.load(html)`. If `$(selector).length > 0` → `in-stock`; else → `out-of-stock`.
- Evidence: count and first match's text.

### `selector-absence.ts`
- Inverse of presence. If `$(selector).length === 0` → `in-stock`; else → `out-of-stock`.
- Evidence: count.

### `shopify-json.ts`
- Derive product JSON URL: if `url` already ends in `.js`, use as-is; otherwise strip query string, ensure `/products/<handle>` shape, then append `.js`. Reject (return `unknown` with evidence) if the URL doesn't look like a Shopify product URL.
- `fetchFn(jsonUrl, { headers: { 'accept': 'application/json' } })`.
- Parse JSON. Read `available` (boolean) — if true → `in-stock`, false → `out-of-stock`. Evidence: `"available=true, variants=N"`.
- Network errors → `unknown` with evidence `"fetch failed: <message>"`. Do not throw.

### Registry — `src/strategies/index.ts`
```ts
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
```

## Test Expectations

For each strategy, write at least three cases. Use small inline HTML strings (no fixture files needed):

- **text-match**
  - HTML containing "På lager" → `in-stock`
  - HTML containing "Utsolgt" → `out-of-stock`
  - HTML matching neither → `unknown`
  - With `selector` scoping: pattern only matches inside selector, not elsewhere on page

- **selector-presence**
  - HTML with `<button class="add-to-cart">` and `selector: '.add-to-cart'` → `in-stock`
  - HTML without that element → `out-of-stock`

- **selector-absence**
  - HTML with `<div class="sold-out">` → `out-of-stock`
  - HTML without it → `in-stock`

- **shopify-json**
  - Stub `fetchFn` to resolve `{ available: true, variants: [{},{}] }` → `in-stock`
  - Stub to resolve `{ available: false }` → `out-of-stock`
  - Stub to reject → `unknown` (no throw)

## Notes
- Strategies must be pure: they take inputs and return a result. No global state, no console output.
- Truncate `evidence` to 200 chars; longer payloads are not useful in a notification.
- Use `cheerio.load(html)` once per call, not per selector — cheap but worth not duplicating.
