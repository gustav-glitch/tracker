const USER_AGENT = 'tracker/1.0 (+https://github.com/YOUR_USERNAME/tracker)';

async function attempt(url: string, fetchFn: typeof fetch): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetchFn(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,*/*' },
      signal: ctrl.signal,
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

export async function fetchHtml(url: string, fetchFn: typeof fetch = fetch): Promise<string> {
  try {
    return await attempt(url, fetchFn);
  } catch {
    await new Promise((r) => setTimeout(r, 1_000));
    return await attempt(url, fetchFn);
  }
}
