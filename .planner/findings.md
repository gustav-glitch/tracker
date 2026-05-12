# Findings

## Repo state
Greenfield. `/Users/gustavbrandbyge/Development/gustav/tracker/` is empty (no git repo, no source files) as of 2026-04-26. Nothing to read or migrate.

## Target sites — quick survey
The targets the user named cluster into two groups, both of which are fine for plain `fetch` + cheerio in nearly all cases:

- **Norwegian general retailers** (nille.no, ringo.no, norli.no, ark.no) — typical e-commerce CMSes that server-render product pages with stock state in the HTML (text patterns like "På lager", "Utsolgt", "Kjøp", "Ikke på lager" or similar selectors). `text-match` will handle most. For anything edge-case, `selector-presence` / `selector-absence` against a product-page CTA or a "sold out" badge.
- **Norwegian Pokémon TCG resellers** — most are Shopify storefronts. Two avenues:
  1. `shopify-json` strategy: `GET https://<host>/products/<handle>.js` returns JSON with `available: true|false`. Most reliable.
  2. `text-match` against the product page HTML as fallback.

## ntfy.sh — relevant facts
- Anonymous publish: `POST https://ntfy.sh/<topic>` with body = message, headers `Title`, `Tags`, `Priority`, `Click`.
- Topic is essentially a password — pick something unguessable (e.g. `tracker-<random-12-chars>`). Anyone who knows the topic can publish/subscribe.
- iOS/macOS app: free, install from App Store / Mac App Store, subscribe to topic.

## GitHub Actions — relevant facts
- Free for public repos and within a generous quota for private. A `*/10 * * * *` schedule runs ~144 times/day; well under any limit.
- Scheduled workflows can be delayed under high load on the runner pool — assume "approximately every 10 min", not exact.
- `concurrency:` with `cancel-in-progress: false` ensures we never run two jobs at once and clobber `state.json`.
- Default `GITHUB_TOKEN` with `permissions: contents: write` can push commits back to the same repo. No PAT needed.
- To prevent commit loops, append `[skip ci]` to the commit message.

## Library choices
- `cheerio` — jQuery-style HTML parsing. Mature, fast.
- `js-yaml` — YAML parsing.
- `zod` — runtime validation of the parsed config; good error messages for malformed YAML.
- `vitest` — test runner. Fast, ESM-native, no Babel/Jest config to fight.
- No HTTP client lib needed — Node 20+ has `fetch`.
