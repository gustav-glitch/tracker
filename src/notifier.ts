import type { Notification } from './transitions.js';

const SIGNAL_TAG: Record<Notification['signal'], { tag: string; emoji: string }> = {
  'in-stock': { tag: 'white_check_mark', emoji: '✅' },
  'changed': { tag: 'bell', emoji: '🔔' },
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
      Title: `${emoji} ${n.trackerName}`,
      Tags: tag,
      Click: n.url,
      Priority: '4',
    },
    body,
  });

  if (!res.ok) throw new Error(`ntfy ${res.status} ${res.statusText}`);
}
