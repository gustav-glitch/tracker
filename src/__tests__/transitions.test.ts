import { describe, it, expect } from 'vitest';
import { detectTransitions } from '../transitions.js';
import type { State } from '../state.js';
import type { TrackerResult } from '../runner.js';

const NOW = new Date('2026-04-26T12:00:00.000Z');
const LONG_AGO = '2026-04-26T00:00:00.000Z'; // > 6h before NOW
const RECENT = '2026-04-26T11:59:00.000Z';   // < 6h before NOW

function result(signal: TrackerResult['signal']): TrackerResult {
  return { id: 'x', name: 'X', url: 'https://example.no', signal, evidence: 'e', checkedAt: NOW.toISOString() };
}

function cooldown() { return 360; }

function emptyState(): State {
  return { version: 1, trackers: {} };
}

function stateWith(partial: Partial<State['trackers']['x']>): State {
  return {
    version: 1,
    trackers: {
      x: {
        lastSignal: 'out-of-stock',
        lastSignalAt: LONG_AGO,
        lastCheckedAt: LONG_AGO,
        ...partial,
      },
    },
  };
}

describe('detectTransitions', () => {
  it('notifies on first in-stock (no prior state)', () => {
    const { notifications } = detectTransitions(emptyState(), [result('in-stock')], cooldown, NOW);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.signal).toBe('in-stock');
  });

  it('notifies on out-of-stock → in-stock', () => {
    const { notifications } = detectTransitions(
      stateWith({ lastSignal: 'out-of-stock' }),
      [result('in-stock')],
      cooldown,
      NOW,
    );
    expect(notifications).toHaveLength(1);
  });

  it('does not notify when cooldown has not elapsed', () => {
    const { notifications } = detectTransitions(
      stateWith({ lastSignal: 'out-of-stock', lastNotifiedSignal: 'in-stock', lastNotifiedAt: RECENT }),
      [result('in-stock')],
      cooldown,
      NOW,
    );
    expect(notifications).toHaveLength(0);
  });

  it('notifies again when cooldown has elapsed', () => {
    const { notifications } = detectTransitions(
      stateWith({ lastSignal: 'in-stock', lastNotifiedSignal: 'in-stock', lastNotifiedAt: LONG_AGO }),
      [result('in-stock')],
      cooldown,
      NOW,
    );
    expect(notifications).toHaveLength(1);
  });

  it('does not notify on in-stock → out-of-stock', () => {
    const { notifications } = detectTransitions(
      stateWith({ lastSignal: 'in-stock', lastNotifiedSignal: 'in-stock', lastNotifiedAt: LONG_AGO }),
      [result('out-of-stock')],
      cooldown,
      NOW,
    );
    expect(notifications).toHaveLength(0);
  });

  it('does not notify on unknown signal', () => {
    const { notifications } = detectTransitions(emptyState(), [result('unknown')], cooldown, NOW);
    expect(notifications).toHaveLength(0);
  });

  it('preserves previous known signal when result is unknown', () => {
    const prev = stateWith({ lastSignal: 'in-stock', lastSignalAt: LONG_AGO });
    const { nextState } = detectTransitions(prev, [result('unknown')], cooldown, NOW);
    expect(nextState.trackers['x']?.lastSignal).toBe('in-stock');
    expect(nextState.trackers['x']?.lastCheckedAt).toBe(NOW.toISOString());
    expect(nextState.trackers['x']?.lastSignalAt).toBe(LONG_AGO);
  });

  it('notifies on first changed signal', () => {
    const { notifications } = detectTransitions(emptyState(), [result('changed')], cooldown, NOW);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.signal).toBe('changed');
  });

  it('updates lastSignalAt only when signal changes', () => {
    const prev = stateWith({ lastSignal: 'in-stock', lastSignalAt: LONG_AGO });
    const { nextState } = detectTransitions(prev, [result('in-stock')], cooldown, NOW);
    expect(nextState.trackers['x']?.lastSignalAt).toBe(LONG_AGO);
    expect(nextState.trackers['x']?.lastCheckedAt).toBe(NOW.toISOString());
  });

  it('updates lastSignalAt when signal changes', () => {
    const prev = stateWith({ lastSignal: 'out-of-stock', lastSignalAt: LONG_AGO });
    const { nextState } = detectTransitions(prev, [result('in-stock')], cooldown, NOW);
    expect(nextState.trackers['x']?.lastSignalAt).toBe(NOW.toISOString());
  });
});
