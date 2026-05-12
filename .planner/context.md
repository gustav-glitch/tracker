# Context

## What the user wants
Personal tool that watches specific product URLs and pushes a phone notification when a product goes in stock or launches. Targets are Norwegian general retailers (nille, ringo, norli, ark) and Norwegian Pokémon TCG seller sites (cardcenter, cardshop, playlot, …). Stock-ticker tracking is explicitly out of scope for v1.

## Hard constraints
- **Zero cost.** Free-tier only. No Fly.io, Railway, Vercel cron, paid Cloudflare features. Anything that could bill the user must be flagged before adding.
- **On/off switch.** User must be able to pause everything trivially (we get this for free via "Disable workflow" in the GitHub Actions UI).
- **Non-intrusive notifications.** ntfy.sh chosen for that reason — no signup, just install the app and subscribe to a topic.

## Decisions already made (do not re-litigate)
- Runner: **GitHub Actions** scheduled workflow, `*/10 * * * *`.
- Stack: **TypeScript / Node 20** with built-in `fetch`.
- Scraping: **cheerio**, no Playwright in v1. Add per-site if a target proves to need JS rendering.
- Config format: **YAML** at repo root (`trackers.yaml`), validated with `zod`.
- Detection strategies: **all four** (`text-match`, `selector-presence`, `selector-absence`, `shopify-json`).
- State persistence: **commit `state.json`** back to repo with `[skip ci]`. Workflow gets `permissions: contents: write`.
- Notifications: **ntfy.sh** push.
- Transition rule: notify only on enter-`in-stock` (or enter-`changed` for generic monitors), respecting a per-tracker cooldown (default 360 min).

## Out of scope for v1
- Web dashboard / CLI for editing trackers (YAML edits only).
- Headless-browser fallback (Playwright).
- Stock ticker / market data tracking.
- Generic "any change" page diffing across the whole DOM.
- Multi-user / auth.

## Open follow-ups (after v1 ships)
- A first real `trackers.yaml` with the user's actual product URLs and selectors. v1 ships with two illustrative example entries that the user replaces.
- Per-site Playwright fallback if a real target turns out to be JS-rendered.
- Possibly a `state` branch instead of committing to `main` if commit noise becomes annoying.
