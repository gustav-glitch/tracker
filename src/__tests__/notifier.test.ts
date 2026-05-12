import { describe, it, expect } from 'vitest';
import { sendNtfy } from '../notifier.js';
import type { Notification } from '../transitions.js';

function captureFetch(): { calls: { url: string; init: RequestInit }[]; fetchFn: typeof fetch } {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchFn = ((url: string, init: RequestInit) => {
    calls.push({ url, init });
    return Promise.resolve({ ok: true, status: 200, statusText: 'OK' });
  }) as unknown as typeof fetch;
  return { calls, fetchFn };
}

const inStock: Notification = {
  trackerId: 'nille-booster',
  trackerName: 'Nille booster pack',
  url: 'https://www.nille.no/produkt/123',
  signal: 'in-stock',
  evidence: 'På lager',
};

const changed: Notification = { ...inStock, signal: 'changed', trackerName: 'Changed product' };

describe('sendNtfy', () => {
  it('POSTs to server/topic', async () => {
    const { calls, fetchFn } = captureFetch();
    await sendNtfy('https://ntfy.sh', 'my-topic', inStock, fetchFn);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe('https://ntfy.sh/my-topic');
    expect((calls[0]?.init as RequestInit).method).toBe('POST');
  });

  it('strips trailing slash from server', async () => {
    const { calls, fetchFn } = captureFetch();
    await sendNtfy('https://ntfy.sh/', 'my-topic', inStock, fetchFn);
    expect(calls[0]?.url).toBe('https://ntfy.sh/my-topic');
  });

  it('sets correct headers for in-stock signal', async () => {
    const { calls, fetchFn } = captureFetch();
    await sendNtfy('https://ntfy.sh', 'my-topic', inStock, fetchFn);
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers['Title']).toBe('✅ Nille booster pack');
    expect(headers['Tags']).toBe('white_check_mark');
    expect(headers['Click']).toBe(inStock.url);
    expect(headers['Priority']).toBe('4');
  });

  it('sets correct headers for changed signal', async () => {
    const { calls, fetchFn } = captureFetch();
    await sendNtfy('https://ntfy.sh', 'my-topic', changed, fetchFn);
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers['Title']).toBe('🔔 Changed product');
    expect(headers['Tags']).toBe('bell');
  });

  it('sends evidence as body', async () => {
    const { calls, fetchFn } = captureFetch();
    await sendNtfy('https://ntfy.sh', 'my-topic', inStock, fetchFn);
    expect(calls[0]?.init.body).toBe('På lager');
  });

  it('truncates body to 1000 chars', async () => {
    const { calls, fetchFn } = captureFetch();
    const long = { ...inStock, evidence: 'x'.repeat(1500) };
    await sendNtfy('https://ntfy.sh', 'my-topic', long, fetchFn);
    expect((calls[0]?.init.body as string).length).toBe(1000);
  });

  it('throws on non-2xx response', async () => {
    const failFetch = (() =>
      Promise.resolve({ ok: false, status: 429, statusText: 'Too Many Requests' })) as unknown as typeof fetch;
    await expect(sendNtfy('https://ntfy.sh', 'my-topic', inStock, failFetch)).rejects.toThrow('ntfy 429');
  });
});
