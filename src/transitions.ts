import type { State, TrackerState } from './state.js';
import type { TrackerResult } from './runner.js';

export type Notification = {
  trackerId: string;
  trackerName: string;
  url: string;
  signal: 'in-stock' | 'changed';
  evidence: string;
};

export function detectTransitions(
  prev: State,
  results: TrackerResult[],
  cooldownLookup: (id: string) => number,
  now: Date,
): { notifications: Notification[]; nextState: State } {
  const next: State = { version: 1, trackers: { ...prev.trackers } };
  const notifications: Notification[] = [];

  for (const r of results) {
    const prevT = prev.trackers[r.id];
    const nowIso = r.checkedAt;

    if (r.signal === 'unknown') {
      next.trackers[r.id] = {
        ...(prevT ?? { lastSignal: 'unknown' as const, lastSignalAt: nowIso }),
        lastCheckedAt: nowIso,
        ...(r.catalogItems !== undefined ? { catalogItems: r.catalogItems } : {}),
      };
      continue;
    }

    const signalChanged = !prevT || prevT.lastSignal !== r.signal;
    next.trackers[r.id] = {
      lastSignal: r.signal,
      lastSignalAt: signalChanged ? nowIso : (prevT?.lastSignalAt ?? nowIso),
      lastCheckedAt: nowIso,
      lastNotifiedSignal: prevT?.lastNotifiedSignal,
      lastNotifiedAt: prevT?.lastNotifiedAt,
      ...(r.catalogItems !== undefined ? { catalogItems: r.catalogItems } : { catalogItems: prevT?.catalogItems }),
    };

    const isPositive = r.signal === 'in-stock' || r.signal === 'changed';
    if (!isPositive) continue;

    if (prevT?.lastNotifiedSignal === r.signal) {
      const cooldownMs = cooldownLookup(r.id) * 60_000;
      const since = prevT.lastNotifiedAt
        ? now.getTime() - new Date(prevT.lastNotifiedAt).getTime()
        : Infinity;
      if (since < cooldownMs) continue;
    }

    notifications.push({
      trackerId: r.id,
      trackerName: r.name,
      url: r.url,
      signal: r.signal as 'in-stock' | 'changed',
      evidence: r.evidence,
    });

    const entry = next.trackers[r.id] as TrackerState;
    entry.lastNotifiedSignal = r.signal as 'in-stock' | 'changed';
    entry.lastNotifiedAt = nowIso;
  }

  return { notifications, nextState: next };
}
