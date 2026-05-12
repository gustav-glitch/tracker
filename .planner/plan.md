# Tracker — product restock & launch alerts

## Goal
Get a free, push-notified alert (via ntfy.sh) within ~10 min of a watched product going in stock or launching on a target site. Initial targets: Norwegian retailers (nille, ringo, norli, ark) and Norwegian Pokémon TCG resellers (cardcenter, cardshop, playlot, …).

## Architecture
- **Runner:** GitHub Actions, scheduled `cron: */10 * * * *`, plus `workflow_dispatch` for manual runs. Free; off-switch is "Disable workflow" in the Actions UI.
- **Language:** TypeScript / Node 20 (built-in `fetch`).
- **Scrape path:** `fetch` + `cheerio`. No headless browser in v1.
- **Config:** `trackers.yaml` at repo root, validated with `zod`. Each tracker picks one of four detection strategies.
- **Detection strategies (all four ship in v1):**
  - `text-match` — regex against full HTML or text of a CSS selector
  - `selector-presence` — selector matches anything (e.g. an "Add to cart" button)
  - `selector-absence` — selector no longer matches (e.g. ".sold-out" gone)
  - `shopify-json` — fetch `<product-url>.js` and read `available`
- **State:** `state.json` committed back to the repo with `[skip ci]`. Transparent, debuggable, no external service.
- **Transition logic:** notify only when a tracker transitions into `in-stock` (or `changed` for generic strategies). Per-tracker `cooldownMinutes` (default 360) suppresses repeat alerts.
- **Notifications:** POST to `https://ntfy.sh/<topic>`. Default topic from config; per-tracker override allowed.

## Repo layout (target end-state)
```
tracker/
├── .github/workflows/check.yml
├── src/
│   ├── cli.ts
│   ├── config.ts
│   ├── fetcher.ts
│   ├── notifier.ts
│   ├── runner.ts
│   ├── state.ts
│   ├── transitions.ts
│   ├── types.ts
│   └── strategies/
│       ├── index.ts
│       ├── types.ts
│       ├── text-match.ts
│       ├── selector-presence.ts
│       ├── selector-absence.ts
│       └── shopify-json.ts
├── trackers.yaml
├── state.json            # committed, mutated by workflow
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

## Tasks
- [x] 01-scaffold — Init repo, package.json, tsconfig, vitest, .gitignore
- [x] 02-config — `trackers.yaml` schema (zod), loader, sample config
- [x] 03-strategies — Four detection strategies + unit tests with HTML fixtures
- [x] 04-runner — Fetcher (UA, timeout, retry) and orchestrator that runs all enabled trackers
- [x] 05-state-transitions — `state.json` read/write, transition detection, cooldown
- [x] 06-notifier — ntfy.sh poster with title/body/tags/click URL + tests
- [x] 07-workflow — `.github/workflows/check.yml` with cron, manual trigger, state commit-back, concurrency guard
- [x] 08-docs — README: setup, ntfy install, adding trackers, enable/disable, local dev
