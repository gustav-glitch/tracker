# tracker

Personal tracker that watches product URLs and pushes ntfy.sh alerts when something restocks or launches. Runs on free GitHub Actions every 30 minutes. Configured via a single YAML file.

## Quickstart

1. Push this repo to your own GitHub account (private is fine).
2. Install **ntfy** on your phone ([App Store](https://apps.apple.com/app/ntfy/id1625396347) / [Play Store](https://play.google.com/store/apps/details?id=io.heckel.ntfy)) and pick an unguessable topic name, e.g. `tracker-3f9a-d2b1`. Subscribe to it in the app.
3. Edit `trackers.yaml`: set `ntfy.defaultTopic` to your topic, replace the example trackers with the URLs you want to watch, and set `enabled: true`.
4. Commit and push. Within ~30 min the GitHub Actions workflow will run and start watching.
5. To pause everything: **Actions → tracker → ⋯ → Disable workflow**. Re-enable any time.

## Adding a tracker

### `text-match` — most Norwegian retailers

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

### `selector-presence` — button appears only when in stock

```yaml
- id: ark-bok-add-to-cart
  name: Ark — bok
  url: https://www.ark.no/produkt/123
  strategy: selector-presence
  with:
    selector: "button[data-test='add-to-cart']"
```

### `selector-absence` — a sold-out badge disappears on restock

```yaml
- id: cardshop-sold-out
  name: Cardshop — set
  url: https://cardshop.no/products/example-set
  strategy: selector-absence
  with:
    selector: ".sold-out, .out-of-stock"
```

### `shopify-json` — any Shopify storefront (most reliable)

```yaml
- id: cardcenter-elite-trainer
  name: Cardcenter — Elite Trainer Box
  url: https://cardcenter.no/products/example-elite-trainer
  strategy: shopify-json
```

## Per-tracker options

| Field | Required | Default | Description |
|---|---|---|---|
| `id` | yes | — | Unique slug (lowercase letters, digits, dashes) |
| `name` | yes | — | Human-readable label shown in the notification |
| `url` | yes | — | Product page URL |
| `strategy` | yes | — | `text-match`, `selector-presence`, `selector-absence`, `shopify-json` |
| `with` | strategy-dependent | — | Strategy-specific config (see examples above) |
| `enabled` | no | `true` | Set to `false` to skip without deleting the entry |
| `cooldownMinutes` | no | `360` | Minimum minutes between repeat alerts for the same signal |
| `ntfyTopic` | no | `ntfy.defaultTopic` | Override the default ntfy topic for this tracker |

## How notifications work

- One ntfy push per positive transition (out-of-stock → in-stock, or first time a product is seen in stock).
- `cooldownMinutes` suppresses repeat alerts for a signal that's been stable — defaults to 6 hours.
- Tap the push to open the product page directly.
- Your topic is your secret — don't share it publicly. To rotate, change `ntfy.defaultTopic` in YAML and resubscribe in the ntfy app.

## Local development

```bash
npm install
npm test
npm run check   # runs once against trackers.yaml using your local state.json
```

A local run with `enabled: true` trackers will send real notifications to your subscribed topic. Set `enabled: false` on entries while testing if you want to avoid that.

## Pause / resume

- **One tracker:** set `enabled: false` in `trackers.yaml`, commit, push.
- **Everything:** Actions → tracker → ⋯ → **Disable workflow**.

## Troubleshooting

**Tracker keeps firing** — cooldown is too short, or the strategy is matching too loosely. Tighten `inStockPattern` or increase `cooldownMinutes`.

**No alert when product restocks** — wrong selector or pattern. Check `state.json` to see what signal the runner recorded last; check the Actions log for the printed `evidence` field.

**`state.json` got corrupted** — delete it and push. The next run rebuilds from scratch.

**A site requires JavaScript to render stock state** — `text-match` and `selector-*` strategies see the raw HTML before JS runs. Try `shopify-json` if the site is a Shopify store; otherwise it's out of scope for this tool.
