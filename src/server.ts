import express from 'express';
import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { load, dump } from 'js-yaml';
import { loadConfig, TrackerSchema, ConfigSchema } from './config.js';
import { loadState } from './state.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.cwd();
const TRACKERS_PATH = path.join(ROOT, 'trackers.yaml');
const STATE_PATH = path.join(ROOT, 'state.json');
const HISTORY_PATH = path.join(ROOT, 'history.json');

const app = express();
app.use(express.json());

let running = false;

// ── Serve dashboard HTML ────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// ── Status: trackers merged with state ─────────────────────────────────────
app.get('/api/status', async (_req, res) => {
  const [cfg, state] = await Promise.all([
    loadConfig(TRACKERS_PATH),
    loadState(STATE_PATH),
  ]);
  const trackers = cfg.trackers.map((t) => ({
    ...t,
    state: state.trackers[t.id] ?? null,
  }));
  res.json({ trackers, ntfy: cfg.ntfy, running });
});

// ── History ─────────────────────────────────────────────────────────────────
app.get('/api/history', async (_req, res) => {
  try {
    const raw = await readFile(HISTORY_PATH, 'utf8');
    res.json(JSON.parse(raw));
  } catch {
    res.json([]);
  }
});

// ── Manual run ───────────────────────────────────────────────────────────────
app.post('/api/run', (req, res) => {
  if (running) {
    res.status(409).json({ error: 'already running' });
    return;
  }
  running = true;
  const child = spawn(
    '/opt/homebrew/bin/node',
    ['node_modules/.bin/tsx', 'src/cli.ts'],
    { cwd: ROOT },
  );
  let output = '';
  child.stdout.on('data', (d: Buffer) => (output += d.toString()));
  child.stderr.on('data', (d: Buffer) => (output += d.toString()));
  child.on('close', (code) => {
    running = false;
    res.json({ success: code === 0, output: output.trim() });
  });
});

// ── Add tracker ──────────────────────────────────────────────────────────────
app.post('/api/trackers', async (req, res) => {
  const parsed = TrackerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.path.join('.') + ': ' + i.message).join('\n') });
    return;
  }
  const raw = load(await readFile(TRACKERS_PATH, 'utf8')) as { ntfy: unknown; trackers: unknown[] };
  const existing = (raw.trackers ?? []) as unknown[];
  const dupe = (existing as Array<{ id?: string }>).some((t) => t.id === parsed.data.id);
  if (dupe) {
    res.status(400).json({ error: `duplicate id: ${parsed.data.id}` });
    return;
  }
  raw.trackers = [...existing, parsed.data];
  await writeFile(TRACKERS_PATH, dump(raw), 'utf8');
  res.json({ ok: true });
});

// ── Toggle enabled ───────────────────────────────────────────────────────────
app.patch('/api/trackers/:id/toggle', async (req, res) => {
  const { id } = req.params;
  const raw = load(await readFile(TRACKERS_PATH, 'utf8')) as { ntfy: unknown; trackers: Array<{ id: string; enabled?: boolean }> };
  const tracker = raw.trackers.find((t) => t.id === id);
  if (!tracker) { res.status(404).json({ error: 'not found' }); return; }
  tracker.enabled = !tracker.enabled;
  await writeFile(TRACKERS_PATH, dump(raw), 'utf8');
  res.json({ ok: true, enabled: tracker.enabled });
});

// ── Delete tracker ───────────────────────────────────────────────────────────
app.delete('/api/trackers/:id', async (req, res) => {
  const { id } = req.params;
  const raw = load(await readFile(TRACKERS_PATH, 'utf8')) as { ntfy: unknown; trackers: Array<{ id: string }> };
  const before = raw.trackers.length;
  raw.trackers = raw.trackers.filter((t) => t.id !== id);
  if (raw.trackers.length === before) { res.status(404).json({ error: 'not found' }); return; }
  await writeFile(TRACKERS_PATH, dump(raw), 'utf8');
  res.json({ ok: true });
});

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = 4321;
app.listen(PORT, () => {
  console.log(`Dashboard → http://localhost:${PORT}`);
});
