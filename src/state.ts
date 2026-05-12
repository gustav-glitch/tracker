import { readFile, writeFile } from 'node:fs/promises';
import type { Signal } from './strategies/types.js';

export type TrackerState = {
  lastSignal: Signal;
  lastSignalAt: string;
  lastCheckedAt: string;
  lastNotifiedSignal?: Exclude<Signal, 'unknown'>;
  lastNotifiedAt?: string;
};

export type State = {
  version: 1;
  trackers: Record<string, TrackerState>;
};

export async function loadState(path: string): Promise<State> {
  try {
    const raw = await readFile(path, 'utf8');
    const parsed = JSON.parse(raw) as { trackers?: Record<string, TrackerState> };
    return { version: 1, trackers: parsed.trackers ?? {} };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      return { version: 1, trackers: {} };
    }
    throw e;
  }
}

export async function saveState(path: string, state: State): Promise<void> {
  await writeFile(path, JSON.stringify(state, null, 2) + '\n', 'utf8');
}
