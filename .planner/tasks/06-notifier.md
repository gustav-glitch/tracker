# Task: ntfy.sh notifier

## Status: done

## Goal
POST each pending notification to ntfy.sh with a useful title, body, click-through URL, and tags. Wire it into the CLI so a real run actually pushes to the user's phone.

## Done When
- [ ] `src/notifier.ts` exports `sendNtfy(server, topic, n: Notification): Promise<void>` (uses `fetch` under the hood; `fetchFn` is injectable for tests)
- [ ] Title is concise: `"<trackerName>"` with a tag prefix indicating the signal (e.g. ✅ for in-stock, 🔔 for changed) — emojis are fine here, this is user-facing notification copy, not source code
- [ ] Body includes the evidence snippet
- [ ] `Click` header is the tracker URL so tapping the push opens the page
- [ ] Per-tracker `ntfyTopic` overrides `config.ntfy.defaultTopic` when set
- [ ] CLI sends notifications instead of just printing them; on send failure, log the error and continue (one bad notification must not abort the run)
- [ ] Tests verify request shape (URL, headers, body) using a stubbed `fetchFn`
- [ ] `npm test` and `npm run typecheck` pass

## Context
Task 6 of 8. Depends on tasks 02 (config), 04 (runner), and 05 (transitions). After this task, a local run with a real `trackers.yaml` and a real ntfy topic delivers push notifications to a subscribed device.

## Files
- Create: `src/notifier.ts`
- Modify: `src/cli.ts` — call `sendNtfy` for each notification
- Create: `src/__tests__/notifier.test.ts`

## Approach

### `src/notifier.ts`
```ts
import type { Notification } from './transitions.js';

const SIGNAL_TAG: Record<Notification['signal'], { tag: string; emoji: string }> = {
  'in-stock': { tag: 'white_check_mark', emoji: '✅' },
  'changed':  { tag: 'bell',             emoji: '🔔' },
};

export async function sendNtfy(
  server: string,
  topic: string,
  n: Notification,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  const { tag, emoji } = SIGNAL_TAG[n.signal];
  const url = `${server.replace(/\/$/, '')}/${encodeURIComponent(topic)}`;
  const body = (n.evidence || n.url).slice(0, 1000);

  const res = await fetchFn(url, {
    method: 'POST',
    headers: {
      'Title':    `${emoji} ${n.trackerName}`,
      'Tags':     tag,
      'Click':    n.url,
      'Priority': '4', // high (5 = max). 4 makes the phone vibrate.
    },
    body,
  });
  if (!res.ok) throw new Error(`ntfy ${res.status} ${res.statusText}`);
}
```

### `src/cli.ts` (final form)
```ts
// after detectTransitions(...)
const topicFor = (id: string) =>
  cfg.trackers.find(t => t.id === id)?.ntfyTopic ?? cfg.ntfy.defaultTopic;

for (const n of notifications) {
  try {
    await sendNtfy(cfg.ntfy.server, topicFor(n.trackerId), n);
    console.log(`notified ${n.trackerId} (${n.signal})`);
  } catch (err) {
    console.error(`failed to notify ${n.trackerId}: ${err instanceof Error ? err.message : err}`);
  }
}

// log a one-line summary so workflow output is readable
console.log(`checked ${results.length}, notified ${notifications.length}`);
```

## Test Expectations
`src/__tests__/notifier.test.ts`:
1. POSTs to `<server>/<topic>` with method POST.
2. Sets `Title`, `Tags`, `Click`, `Priority` headers correctly for both `in-stock` and `changed` signals.
3. Body equals `n.evidence` (truncated to 1000 chars when longer).
4. Throws on non-2xx response.

Use a stub `fetchFn` that returns a `Response`-like object. Do not hit ntfy.sh in tests.

## Notes
- ntfy.sh accepts unauthenticated POSTs to any topic; the topic itself is the secret. Treat the topic as a credential — don't log it.
- Don't bundle a separate HTTP client (`undici`/`axios`); built-in `fetch` is enough.
- Keep the notifier dumb. No batching, no rate limiting, no retries — the runner handles individual failures by catching them in the CLI loop.
