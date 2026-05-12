# Task: Config schema, loader, and sample `trackers.yaml`

## Status: done

## Goal
Define the YAML config that drives the tracker, parse it with helpful errors, and ship a sample `trackers.yaml` with two illustrative entries (one Norwegian retailer using `text-match`, one Shopify-style entry using `shopify-json`).

## Done When
- [ ] `src/types.ts` exports the `Config`, `TrackerConfig`, and per-strategy config shapes
- [ ] `src/config.ts` exports `loadConfig(path: string): Promise<Config>` that reads YAML, validates with zod, and throws a readable error pointing at the bad field on failure
- [ ] `trackers.yaml` exists at repo root with two example entries (commented-out placeholders the user will replace) and one default ntfy topic
- [ ] `src/__tests__/config.test.ts` covers: valid config parses; missing required field surfaces a clear zod error; unknown strategy is rejected
- [ ] `npm test` and `npm run typecheck` both pass

## Context
Task 2 of 8. Depends on task 01 scaffold. The schema needs to be flexible enough for all four strategies in task 03; if you add a strategy, add it here. Per-strategy config lives under a `with:` key so the YAML stays readable.

## Files
- Create: `src/types.ts`
- Create: `src/config.ts`
- Create: `src/__tests__/config.test.ts`
- Create: `trackers.yaml`

## Approach

### Schema (zod)
Discriminated union on `strategy`. Sketch:

```ts
const Base = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'lowercase letters, digits, dashes only'),
  name: z.string().min(1),
  url: z.string().url(),
  ntfyTopic: z.string().min(1).optional(),
  cooldownMinutes: z.number().int().positive().default(360),
  enabled: z.boolean().default(true),
});

const TextMatch = Base.extend({
  strategy: z.literal('text-match'),
  with: z.object({
    selector: z.string().optional(),       // if absent, match against full HTML
    inStockPattern: z.string().optional(),  // regex source
    outOfStockPattern: z.string().optional(),
    flags: z.string().default('i'),
  }).refine(v => v.inStockPattern || v.outOfStockPattern, {
    message: 'at least one of inStockPattern / outOfStockPattern is required',
  }),
});

const SelectorPresence = Base.extend({
  strategy: z.literal('selector-presence'),
  with: z.object({ selector: z.string().min(1) }),
});

const SelectorAbsence = Base.extend({
  strategy: z.literal('selector-absence'),
  with: z.object({ selector: z.string().min(1) }),
});

const ShopifyJson = Base.extend({
  strategy: z.literal('shopify-json'),
  with: z.object({}).default({}),  // derived from url; no extra config needed
});

const Tracker = z.discriminatedUnion('strategy', [TextMatch, SelectorPresence, SelectorAbsence, ShopifyJson]);

const Config = z.object({
  ntfy: z.object({
    server: z.string().url().default('https://ntfy.sh'),
    defaultTopic: z.string().min(1),
  }),
  trackers: z.array(Tracker),
}).superRefine((cfg, ctx) => {
  const ids = new Set<string>();
  cfg.trackers.forEach((t, i) => {
    if (ids.has(t.id)) ctx.addIssue({ code: 'custom', path: ['trackers', i, 'id'], message: `duplicate id: ${t.id}` });
    ids.add(t.id);
  });
});
```

### `loadConfig`
- `readFile(path, 'utf8')` → `yaml.load(text)` → `Config.parse(parsed)`
- Catch zod errors and rethrow as a single `Error` with `error.issues.map(i => i.path.join('.') + ': ' + i.message).join('\n')`. The CLI later prints this directly.

### Sample `trackers.yaml`
```yaml
ntfy:
  server: https://ntfy.sh
  # Replace with your own unguessable topic, e.g. tracker-3f9a-d2b1
  defaultTopic: tracker-CHANGE-ME

trackers:
  # --- Example: Norwegian retailer with text-match ---
  - id: example-retailer
    name: Example product on a Norwegian retailer
    url: https://www.example.no/produkt/123
    strategy: text-match
    enabled: false
    with:
      selector: ".product-availability, .stock-status"
      inStockPattern: "på lager|kjøp|legg i handlekurv"
      outOfStockPattern: "utsolgt|ikke på lager|ikke tilgjengelig"

  # --- Example: Shopify-based TCG seller ---
  - id: example-shopify
    name: Example product on a Shopify storefront
    url: https://example-shop.no/products/some-pokemon-product
    strategy: shopify-json
    enabled: false
```

Both entries are `enabled: false` so the workflow doesn't fire on placeholder URLs after the first deploy. Real entries replace these.

## Test Expectations
`src/__tests__/config.test.ts`:
1. Valid full-config parses and applies defaults (e.g. `cooldownMinutes` becomes 360, `enabled` becomes true, `ntfy.server` defaults).
2. Tracker with unknown `strategy` value throws.
3. Two trackers with the same `id` throw the duplicate-id error from `superRefine`.
4. `text-match` with neither pattern throws the "at least one of …" message.

Use small inline YAML strings (no fixture files needed for this task).

## Notes
- Do not create the trackers themselves with real URLs — these are placeholders the user replaces.
- `defaultTopic: tracker-CHANGE-ME` is intentional: the test in task 06 will verify the workflow refuses to send if it's still the placeholder, OR README will instruct user to change before enabling. Defer that check to README in task 08.
