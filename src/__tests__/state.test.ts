import { describe, it, expect } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadState, saveState } from '../state.js';
import type { State } from '../state.js';

async function withTmp(fn: (dir: string) => Promise<void>) {
  const dir = await mkdtemp(path.join(tmpdir(), 'tracker-test-'));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe('state', () => {
  it('returns empty state when file does not exist', async () => {
    await withTmp(async (dir) => {
      const state = await loadState(path.join(dir, 'state.json'));
      expect(state).toEqual({ version: 1, trackers: {} });
    });
  });

  it('round-trips saveState / loadState', async () => {
    await withTmp(async (dir) => {
      const filePath = path.join(dir, 'state.json');
      const state: State = {
        version: 1,
        trackers: {
          'nille-booster': {
            lastSignal: 'in-stock',
            lastSignalAt: '2026-04-26T10:00:00.000Z',
            lastCheckedAt: '2026-04-26T10:05:00.000Z',
            lastNotifiedSignal: 'in-stock',
            lastNotifiedAt: '2026-04-26T10:00:00.000Z',
          },
        },
      };
      await saveState(filePath, state);
      const loaded = await loadState(filePath);
      expect(loaded).toEqual(state);
    });
  });

  it('tolerates missing tracker fields (schema drift)', async () => {
    await withTmp(async (dir) => {
      const filePath = path.join(dir, 'state.json');
      // write minimal JSON without version
      const { writeFile } = await import('node:fs/promises');
      await writeFile(filePath, JSON.stringify({ trackers: {} }), 'utf8');
      const state = await loadState(filePath);
      expect(state.version).toBe(1);
    });
  });
});
