# Task: README and end-user docs

## Status: done

## Goal
Replace the placeholder README with a complete walkthrough so the user (or anyone else) can: clone the repo, install ntfy on their phone, configure their first tracker, push to GitHub, and start receiving alerts — without re-reading the source.

## Done When
- [ ] `README.md` exists at repo root and covers every section listed under Approach below
- [ ] One real-world-shaped example tracker for each of the four strategies is included (URL can be a placeholder, but the YAML must be valid)
- [ ] The on/off instructions for both an individual tracker (`enabled: false`) and the entire workflow ("Disable workflow" in Actions UI) are unambiguous
- [ ] No mention of paid services, no "future enhancements" wishlist
- [ ] `npm test` and `npm run typecheck` still pass (this task should not touch source code)

## Context
Task 8 of 8. Final task before the project is shippable. Depends on every previous task — the README references files and behavior they create.

The README is the only documentation surface. Keep it tight and practical, not a marketing page.

## Files
- Modify: `README.md`

## Approach

### Sections (in order)

**1. What this is** (3 sentences)
Personal tracker that watches product URLs and pushes ntfy.sh alerts when something restocks or launches. Runs on free GitHub Actions every 10 min. Configured via a single YAML file.

**2. Quickstart** (numbered list)
1. Fork or clone this repo, then push it to your own GitHub account (private repo is fine).
2. Install **ntfy** on your phone (App Store / Play Store) and pick an unguessable topic name, e.g. `tracker-3f9a-d2b1`. Subscribe to it in the app.
3. Edit `trackers.yaml`: set `ntfy.defaultTopic` to your topic, replace the example trackers with the URLs you actually want to watch, and set `enabled: true`.
4. Commit and push. Within ~10 min the GitHub Actions workflow will run and start watching.
5. To pause everything, go to **Actions → tracker → ⋯ → Disable workflow**. Re-enable any time.

**3. Adding a tracker** — show a YAML block per strategy:

- `text-match` (most retailers):
  ```yaml
  - id: nille-some-product
    name: Nille — some product
    url: https://www.nille.no/p/123-some-product/
    strategy: text-match
    with:
      selector: ".product-availability"
      inStockPattern: "på lager|kjøp|legg i handlekurv"
      outOfStockPattern: "utsolgt|ikke på lager"
  ```
- `selector-presence` (when an "Add to cart" button appears only when in stock):
  ```yaml
  - id: ark-bok-add-to-cart
    name: Ark — bok
    url: https://www.ark.no/produkt/123
    strategy: selector-presence
    with:
      selector: "button[data-test='add-to-cart']"
  ```
- `selector-absence` (when a `.sold-out` badge disappears on restock):
  ```yaml
  - id: cardshop-sold-out
    name: Cardshop — set
    url: https://cardshop.no/products/example-set
    strategy: selector-absence
    with:
      selector: ".sold-out, .out-of-stock"
  ```
- `shopify-json` (any Shopify storefront — most reliable):
  ```yaml
  - id: cardcenter-elite-trainer
    name: Cardcenter — Elite Trainer Box
    url: https://cardcenter.no/products/example-elite-trainer
    strategy: shopify-json
  ```

**4. Per-tracker options**
Brief table: `id`, `name`, `url`, `strategy`, `with`, `enabled` (default true), `cooldownMinutes` (default 360), `ntfyTopic` (overrides default).

**5. How notifications work**
- One ntfy POST per positive transition (out-of-stock → in-stock, or first time we see a launch).
- `cooldownMinutes` suppresses repeat alerts for the same signal.
- Tap the push to open the product page.
- Topic is your secret — don't share it. To rotate, change `ntfy.defaultTopic` in YAML and resubscribe in the ntfy app.

**6. Local development**
```bash
npm install
npm test
npm run check   # runs once against trackers.yaml using your local state.json
```
Note: a local run with valid trackers will send real notifications to your subscribed topic. Set `enabled: false` on entries you're testing if you want to avoid this.

**7. Pause / resume**
- One tracker: `enabled: false` in YAML, commit, push.
- Everything: Actions → tracker → ⋯ → **Disable workflow**.

**8. Troubleshooting**
- Tracker keeps firing → cooldown too short, or strategy is matching too loosely (tighten `inStockPattern`).
- No alert when product restocks → wrong selector / pattern. Check `state.json` for what the runner saw last; check Actions logs for the printed `evidence`.
- `state.json` got corrupted → delete it and push; the next run rebuilds from scratch.
- A site uses JavaScript to render stock state → `text-match` and `selector-*` will see an empty page. Try `shopify-json` first; if that doesn't apply, this site is out of v1 scope.

## Test Expectations
Manual smoke-read: a new user could follow Quickstart end-to-end with no other context and arrive at working alerts. Don't add automated tests for documentation.

## Notes
- Do NOT add badges, screenshots, or marketing copy.
- Do NOT write a CONTRIBUTING.md, CHANGELOG.md, or LICENSE in this task — out of scope.
- Strategy examples should be illustrative; don't claim a specific selector is the right one for `nille.no` etc. — the user verifies per site.
