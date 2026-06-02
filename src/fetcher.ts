const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

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

export async function fetchWithPlaywright(url: string): Promise<string> {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent: USER_AGENT,
      locale: 'nb-NO',
      extraHTTPHeaders: { 'accept-language': 'nb-NO,nb;q=0.9,no;q=0.8,en;q=0.7' },
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    return await page.content();
  } finally {
    await browser.close();
  }
}
