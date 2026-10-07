// Ray edition — lightweight static + /api shim for the 3D office (replaces serve.mjs).
// Serves the baked 3D office bundle and answers the frontend's /api/* polls from
// office-state.json (rewritten every 15 min by ray-dashboard.py). No Claude calls.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
const execFileP = promisify(execFile);

const ROOT = new URL('.', import.meta.url).pathname;
const PORT = Number(process.env.PORT || 8082);
const STATE = process.env.OFFICE_STATE || (process.env.HOME + '/workspace/ray-dashboard/office-state.json');
const BUNDLE = path.join(ROOT, 'dist', 'command-centre-v2.html');
const BRAIN_DIR = process.env.BRAIN_DIR || (process.env.HOME + '/workspace/ray-dashboard/brain');
const TRADES_DIR = process.env.TRADES_DIR || (process.env.HOME + '/ray-office/trades');
const VAULT_DIR = process.env.VAULT_DIR || (process.env.HOME + '/workspace/second-brain');
const OFFICE_DIR = '/office';
const MOBILE_HTML = path.join(ROOT, 'mobile.html'); // lightweight mobile view (no 3D)
const MOBILE_UA = /iPhone|iPad|iPod|Android|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i;
const INBOX_DIR = path.join(ROOT, 'inbox');       // phone-local: one JSON file per inbound item
const REPLIES_FILE = path.join(ROOT, 'replies.json'); // phone-local: JSON-lines, one reply per line
const FLAT_FILE = (process.env.HOME + '/ray-dashboard/index.html'); // activity board (also served on :8081)

const HUB_HTML = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Ray Terminal</title><style>
:root{--bg:#0D0D0F;--panel:#141416;--amber:#FFA028;--txt:#E8E6E3;--dim:#8A877F;--line:#232326}
*{margin:0;padding:0;box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{background:var(--bg);color:var(--txt);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;min-height:100vh;display:flex;flex-direction:column}
.top{border-bottom:1px solid var(--line);padding:14px 18px;display:flex;align-items:center;gap:10px;font-size:13px;letter-spacing:2px}
.dot{width:8px;height:8px;border-radius:50%;background:#3ddc84;animation:blink 1.6s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.25}}
.top b{color:var(--amber)}
.wrap{max-width:720px;width:100%;margin:0 auto;padding:36px 20px 60px;flex:1}
.kicker{color:var(--dim);font-size:11px;letter-spacing:3px;margin-bottom:10px}
h1{font-size:34px;letter-spacing:4px;margin-bottom:6px}
.sub{color:var(--dim);font-size:13px;margin-bottom:28px}
.card{display:block;text-decoration:none;color:var(--txt);background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:20px;margin-bottom:14px}
.card:active{border-color:var(--amber)}
.card .name{color:var(--amber);font-size:17px;letter-spacing:2px;margin-bottom:6px}
.card .desc{color:var(--dim);font-size:13px;line-height:1.5}
.card .go{float:right;color:var(--amber);font-size:18px}
.foot{text-align:center;color:var(--dim);font-size:11px;letter-spacing:2px;padding:18px}
/* desktop: multi-column grid for the four hub cards */
@media(min-width:1024px){
.top{padding:18px 36px;font-size:14px}
.wrap{max-width:1120px;padding:72px 40px 90px}
.kicker{font-size:12px;letter-spacing:4px;margin-bottom:14px}
h1{font-size:58px;letter-spacing:9px;margin-bottom:10px}
.sub{font-size:15px;margin-bottom:44px}
.cards{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.card{margin-bottom:0;padding:30px;min-height:186px}
.card:hover{border-color:var(--amber)}
.card .name{font-size:21px;letter-spacing:3px;margin-bottom:10px}
.card .desc{font-size:14px}
.card .go{font-size:22px}
.foot{font-size:12px;padding:26px}
}
@media(min-width:1500px){
.cards{grid-template-columns:repeat(4,1fr)}
.card{min-height:220px}
}
</style></head><body>
<div class="top"><span class="dot"></span><b>RAY</b><span>TERMINAL</span></div>
<div class="wrap">
<div class="kicker">ONE ADDRESS // EVERYTHING</div>
<h1>RAY TERMINAL</h1>
<div class="sub">Every dashboard lives here. Pick one.</div>
<div class="cards">
<a class="card" href="/flat/"><span class="go">&#9656;</span><div class="name">FLAT</div><div class="desc">Activity board — workers, commitments, schedules, daily log.</div></a>
<a class="card" href="/office/"><span class="go">&#9656;</span><div class="name">OFFICE</div><div class="desc">Command centre — the 3D office, chat with Ray, tasks.</div></a>
<a class="card" href="/brain/"><span class="go">&#9656;</span><div class="name">BRAIN</div><div class="desc">Second brain — the Obsidian vault, graph and search.</div></a>
<a class="card" href="/trades/"><span class="go">&#9656;</span><div class="name">TRADES</div><div class="desc">Live portfolio — stock positions, mutual funds, market news.</div></a>
</div>
</div>
<div class="foot">RAY // TERMINAL</div>
</body></html>`;

const CREW = [
  { id: 'radar', name: 'RADAR', dept: 'emails', lead: true, does: 'I scan BSE insider filings and grind the quant research.', setUp: true },
  { id: 'deepscan', name: 'DEEP SCAN', dept: 'emails', does: 'I re-read the filings nobody else bothers with.', setUp: true },
  { id: 'forge', name: 'FORGE', dept: 'delivery', lead: true, does: 'I build the things — firmware, dashboards, bots.', setUp: true },
  { id: 'firmware', name: 'FIRMWARE', dept: 'delivery', does: 'ESP32-S3 and the BMS tester live here.', setUp: true },
  { id: 'apps', name: 'APPS', dept: 'delivery', does: 'Dashboards, scripts, the phone link.', setUp: true },
  { id: 'scribe', name: 'SCRIBE', dept: 'sales', lead: true, does: 'Docs, logs, memory — nothing gets lost.', setUp: true },
  { id: 'archive', name: 'ARCHIVE', dept: 'sales', does: 'The vault is indexed and every link resolves.', setUp: true },
  { id: 'relay', name: 'RELAY', dept: 'marketing', lead: true, does: 'WhatsApp, Discord, notifications — the voice.', setUp: true },
  { id: 'pager', name: 'PAGER', dept: 'marketing', does: 'Watchdogs and heartbeats.', setUp: true },
  { id: 'captain', name: 'CAPTAIN', dept: 'ops', lead: true, does: 'I plan the work and split it across the crew.', setUp: true },
  { id: 'bhavishya', name: 'BHAVISHYA', dept: 'fin', lead: true, does: "The owner's desk. Money moves need his word.", setUp: true },
  { id: 'sentinel', name: 'SENTINEL', dept: 'fin', does: 'I watch the money — positions, cuts, SIPs.', setUp: true },
];
const DEPT_KEYS = ['emails', 'delivery', 'sales', 'marketing', 'fin', 'ops'];

let state = {};
function loadState() {
  try { state = JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch { state = {}; }
}
loadState();
setInterval(loadState, 15000);

const json = (res, obj, code = 200) => {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(obj));
};
const readBody = (req, cap = 65536) => new Promise(r => {
  let b = '', dead = false;
  req.on('data', c => { if (!dead) { b += c; if (b.length > cap) { dead = true; r(null); } } });
  req.on('end', () => { if (dead) return; try { r(JSON.parse(b || '{}')); } catch { r({}); } });
});

/* ---------- office → Ray inbox relay (one-way in; replies go out via /api/replies) ---------- */
function storeInbox(rec) {
  fs.mkdirSync(INBOX_DIR, { recursive: true });
  const tmp = path.join(INBOX_DIR, rec.id + '.tmp');
  fs.writeFileSync(tmp, JSON.stringify(rec));
  fs.renameSync(tmp, path.join(INBOX_DIR, rec.id + '.json')); // atomic publish
}
function readReplies() {
  let raw;
  try { raw = fs.readFileSync(REPLIES_FILE, 'utf8'); } catch { return []; }
  const out = [];
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try { const o = JSON.parse(t); if (o && typeof o.text === 'string') out.push(o); } catch { /* skip corrupt line */ }
  }
  return out;
}

function health() {
  return {
    ok: true, version: '3.2.1-ray', name: "Ray's Office", backend: 'ray-shim',
    brain: 'second-brain',
    teams: { enabled: true, max: 4 },
    agents: CREW.map(a => ({ id: a.id, name: a.name, dept: a.dept, lead: !!a.lead, does: a.does, setUp: true })),
    notes: (state.brain && state.brain.notes) || 0,
    generated: state.generated || null,
  };
}

function tasks() {
  // office-state.json "tasks": [{id, agent, title, text, state, addedAt}] — straight through
  return Array.isArray(state.tasks) ? state.tasks : [];
}
function routines() {
  const crons = Array.isArray(state.crons) ? state.crons : [];
  return {
    routines: crons.filter(c => c.enabled !== false).slice(0, 20).map(c => ({
      id: c.id, dept: 'ops',
      title: c.title || c.id, text: c.title || c.id,
      desc: c.cadence || '', // real schedule descriptor from the source data
      when: c.next_run || '', // the dashboard's own human-readable next-run label ("Wed 11:00")
      next: c.next_run || '', nextRun: c.next_run || '',
      nextAt: c.next_run_ts || null, // real epoch ms — the UI counts down live from this
      paused: false,
    })),
    depts: DEPT_KEYS, path: '', problems: [],
  };
}

/* ---------- live market data (server-side fetch, cached; same-origin for the pages) ---------- */
const __mc = new Map();
const mcGet = (k, ttl) => { const e = __mc.get(k); return (e && Date.now() - e.t < ttl) ? e.v : undefined; };
const mcSet = (k, v) => { __mc.set(k, { t: Date.now(), v }); if (__mc.size > 80) __mc.delete(__mc.keys().next().value); };
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
/* ---------- sentiment batch scoring via phone llama-server (SSH multiplexed over Tor) ---------- */
const SENT_CACHE_TTL = 10 * 60 * 1000; // 10 min per headline text
const SENT_SOCK = '/tmp/phone-sentiment.sock';
const SENT_SSH_BASE = ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=30', 'phone-tor'];
const SENT_REMOTE = ['proot-distro', 'login', 'ubuntu', '--', 'python3', '/root/sentiment/scorer_llama.py'];
// One persistent master: a single Tor handshake reused by every batch (cuts ~5-15s per batch).
function sentMasterStart() {
  try {
    const m = spawn('ssh', ['-M', '-S', SENT_SOCK, '-o', 'ControlPersist=600', ...SENT_SSH_BASE, '-N'],
      { stdio: 'ignore', detached: true });
    m.unref();
    m.on('error', () => {});
    return m;
  } catch { return null; }
}
let sentMaster = sentMasterStart();
setInterval(() => { // refresh the master if it dropped
  if (!sentMaster || sentMaster.exitCode !== null || sentMaster.signalCode) sentMaster = sentMasterStart();
}, 30000);
async function sshSentiment(input) {
  const muxArgs = ['-S', SENT_SOCK, '-o', 'ControlMaster=no', '-o', 'ConnectTimeout=15', 'phone-tor', ...SENT_REMOTE];
  try {
    const { stdout } = await execFileP('ssh', muxArgs, { input, timeout: 120000, maxBuffer: 4 * 1024 * 1024 });
    return stdout;
  } catch (e) {
    // socket dead or stale — make sure a master is (re)starting, then fall back to a fresh connection
    if (!sentMaster || sentMaster.exitCode !== null || sentMaster.signalCode) sentMaster = sentMasterStart();
    const { stdout } = await execFileP('ssh', [...SENT_SSH_BASE, ...SENT_REMOTE],
      { input, timeout: 120000, maxBuffer: 4 * 1024 * 1024 });
    return stdout;
  }
}
function scoreSentimentBatch(items) {
  return new Promise((resolve) => {
    const lines = items.map(o => JSON.stringify({ id: o.id, text: o.text })).join('\n') + '\n';
    sshSentiment(lines)
      .then((stdout) => {
        const out = new Map();
        for (const ln of String(stdout).split('\n')) {
          const t = ln.trim(); if (!t) continue;
          try { const o = JSON.parse(t); if (o && o.id !== undefined) out.set(String(o.id), o); } catch { /* skip */ }
        }
        resolve(out);
      })
      .catch((e) => { console.error('[sentiment] ssh failed:', e.code, (e.stderr || '').slice(0, 200), e.message.slice(0, 200)); resolve(null); });
  });
}
async function fetchText(url, ms = 12000) {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { 'User-Agent': UA } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.text();
  } finally { clearTimeout(to); }
}
async function yahooQuote(sym) {
  const key = 'q:' + sym;
  const hit = mcGet(key, 10000);
  if (hit) return hit;
  const j = JSON.parse(await fetchText('https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(sym) + '?interval=1d&range=2d'));
  const m = j.chart.result[0].meta;
  const price = m.regularMarketPrice;
  const prev = m.chartPreviousClose || m.previousClose || price;
  const out = {
    symbol: sym, price: +price.toFixed(2), prev_close: +prev.toFixed(2),
    change: +((price - prev).toFixed(2)), change_pct: +(((price - prev) / prev * 100).toFixed(2)),
    day_high: m.regularMarketDayHigh ?? null, day_low: m.regularMarketDayLow ?? null,
    w52_high: m.fiftyTwoWeekHigh ?? null, w52_low: m.fiftyTwoWeekLow ?? null,
    as_of: (m.regularMarketTime || 0) * 1000,
  };
  mcSet(key, out);
  return out;
}
/* full daily NAV history for one fund (newest first), cached 6h — powers the
   "today's portfolio, backtested" comparison in /api/pfseries */
async function mfNavHistory(code) {
  const key = 'mfh:' + code;
  const hit = mcGet(key, 6 * 3600e3);
  if (hit) return hit;
  const j = JSON.parse(await fetchText('https://api.mfapi.in/mf/' + code));
  const rows = (j.data || []).map(d => {
    const dp = String(d.date || '').split('-'); // DD-MM-YYYY
    const t = dp.length === 3 ? Date.parse(dp[2] + '-' + dp[1] + '-' + dp[0] + 'T00:00:00Z') : NaN;
    return { t, nav: parseFloat(d.nav) };
  }).filter(r => !isNaN(r.t) && r.nav > 0);
  mcSet(key, rows);
  return rows;
}
function navAtOrBefore(rows, ts) {
  for (const r of rows) if (r.t <= ts) return r.nav;
  return rows.length ? rows[rows.length - 1].nav : null; // oldest available
}
const TF = {
  '1D': { range: '1d', interval: '5m' },
  '5D': { range: '5d', interval: '15m' },
  '1M': { range: '1mo', interval: '1d' },
  '3M': { range: '3mo', interval: '1d' },
  '6M': { range: '6mo', interval: '1d' },
  'YTD': { range: 'ytd', interval: '1d' },
  '1Y': { range: '1y', interval: '1wk' },
  '2Y': { range: '2y', interval: '1wk' },
  '5Y': { range: '5y', interval: '1mo' },
};
async function yahooSeries(sym, tf) {
  const cfg = TF[tf] || TF['1D'];
  const key = 's:' + tf + ':' + sym;
  const hit = mcGet(key, 60000);
  if (hit) return hit;
  const j = JSON.parse(await fetchText('https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(sym) + '?interval=' + cfg.interval + '&range=' + cfg.range));
  const r = j.chart.result[0];
  const ts = r.timestamp || [], closes = (r.indicators.quote[0] || {}).close || [];
  let pts = [];
  for (let i = 0; i < ts.length; i++) {
    if (closes[i] == null) continue;
    pts.push([ts[i] * 1000, closes[i]]);
  }
  /* 1D: % vs previous close; longer frames: % vs first point in series */
  const base = tf === '1D' ? (r.meta.chartPreviousClose || r.meta.previousClose) : (pts.length ? pts[0][1] : null);
  let pctPts = base ? pts.map(p => [p[0], +(((p[1] - base) / base * 100).toFixed(3))]) : [];
  let rawPts = pts.map(p => [p[0], +p[1].toFixed(4)]);
  if (pctPts.length > 120) { const st = Math.ceil(pctPts.length / 120); const keep = (_, i) => i % st === 0 || i === pctPts.length - 1; pctPts = pctPts.filter(keep); rawPts = rawPts.filter(keep); }
  const out = { symbol: sym, tf, base, points: pctPts, closes: rawPts };
  mcSet(key, out);
  return out;
}
async function mfNav(code) {
  const key = 'mf:' + code;
  const hit = mcGet(key, 6 * 3600e3);
  if (hit) return hit;
  const j = JSON.parse(await fetchText('https://api.mfapi.in/mf/' + code));
  const d0 = j.data[0], d1 = j.data[1] || {};
  const out = {
    code, name: j.meta.scheme_name,
    nav: parseFloat(d0.nav), date: d0.date,
    prev_nav: d1.nav != null ? parseFloat(d1.nav) : null, prev_date: d1.date || null,
  };
  mcSet(key, out);
  return out;
}
function parseRss(xml, cap = 6) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  const clean = s => (s || '').replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();
  let m;
  while ((m = re.exec(xml)) && items.length < cap) {
    const b = m[1];
    items.push({
      title: clean((b.match(/<title>([\s\S]*?)<\/title>/) || [])[1]),
      link: clean((b.match(/<link>([\s\S]*?)<\/link>/) || [])[1]),
      pub: clean((b.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1]),
      source: clean((b.match(/<source[^>]*>([\s\S]*?)<\/source>/) || [])[1]),
    });
  }
  return items;
}
async function gnews(q) {
  const key = 'n:' + q;
  const hit = mcGet(key, 20 * 60e3);
  if (hit) return hit;
  const xml = await fetchText('https://news.google.com/rss/search?q=' + encodeURIComponent(q) + '&hl=en-IN&gl=IN&ceid=IN:en');
  const items = parseRss(xml);
  mcSet(key, items);
  return items;
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const p = u.pathname;

  if (p === '/') { // unified terminal hub — one address for everything
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(HUB_HTML);
    return;
  }
  if (p === '/flat' || p === '/flat/') { // activity board, merged into the single address
    fs.readFile(FLAT_FILE, (e, html) => {
      if (e) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('flat board not found'); return; }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end(html);
    });
    return;
  }
  if (p === OFFICE_DIR || p === OFFICE_DIR + '/') {
    // Mobile UAs get the lightweight mobile view; desktop keeps the 3D bundle.
    // ?desktop=1 forces the 3D bundle (used by the mobile page's "Desktop 3D view" link).
    const ua = req.headers['user-agent'] || '';
    const wantDesktop = u.searchParams.get('desktop') === '1';
    const file = (!wantDesktop && MOBILE_UA.test(ua)) ? MOBILE_HTML : BUNDLE;
    fs.readFile(file, (e, html) => {
      if (e) { res.writeHead(500); res.end('page missing — build first'); return; }
      // RAY EDITION: no-cache so iPhone Safari always fetches fresh bytes after a push
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'vary': 'User-Agent' }); res.end(html);
    });
    return;
  }
  if (p === '/office/mobile') { // explicit mobile view (testing / fallback)
    fs.readFile(MOBILE_HTML, (e, html) => {
      if (e) { res.writeHead(500); res.end('mobile page missing'); return; }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end(html);
    });
    return;
  }
  if (p === '/brain' || p === '/brain/') {
    const idx = path.join(BRAIN_DIR, 'index.html');
    fs.readFile(idx, (e, html) => {
      if (e) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('brain not built yet'); return; }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(html);
    });
    return;
  }
  if (p.startsWith('/brain/notes/')) { // raw vault markdown for the viewer
    const name = decodeURIComponent(p.slice(13));
    if (name.includes('/') || name.includes('\\') || !name.endsWith('.md')) { res.writeHead(400); res.end(); return; }
    fs.readFile(path.join(VAULT_DIR, name), (e, data) => {
      if (e) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': 'text/markdown; charset=utf-8' }); res.end(data);
    });
    return;
  }
  if (p.startsWith('/brain/')) {
    const f = path.normalize(path.join(BRAIN_DIR, decodeURIComponent(p.slice(7))));
    if (!f.startsWith(BRAIN_DIR)) { res.writeHead(403); res.end(); return; }
    fs.readFile(f, (e, data) => {
      if (e) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': f.endsWith('.json') ? 'application/json' : 'text/plain' }); res.end(data);
    });
    return;
  }

  if (p === '/trades' || p === '/trades/') {
    const idx = path.join(TRADES_DIR, 'index.html');
    fs.readFile(idx, (e, html) => {
      if (e) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('trades not built yet'); return; }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end(html);
    });
    return;
  }
  if (p === '/trades/trades.json') {
    fs.readFile(path.join(TRADES_DIR, 'trades.json'), (e, data) => {
      if (e) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(data);
    });
    return;
  }
  if (p === '/api/quotes' && req.method === 'GET') { // ?symbols=WESTLIFE.NS,JSL.NS — live NSE quotes via Yahoo
    const syms = (u.searchParams.get('symbols') || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 12);
    if (!syms.length) return json(res, { ok: false, error: 'symbols required' }, 400);
    const quotes = await Promise.all(syms.map(s => yahooQuote(s).catch(e => ({ symbol: s, error: String((e && e.message) || e) }))));
    return json(res, { ok: true, quotes });
  }
  if (p === '/api/series' && req.method === 'GET') { // ?symbols=WESTLIFE.NS,JSL.NS&tf=1D — % move series per timeframe
    const syms = (u.searchParams.get('symbols') || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 6);
    const tf = TF[(u.searchParams.get('tf') || '1D').toUpperCase()] ? (u.searchParams.get('tf') || '1D').toUpperCase() : '1D';
    if (!syms.length) return json(res, { ok: false, error: 'symbols required' }, 400);
    const series = await Promise.all(syms.map(s => yahooSeries(s, tf).catch(e => ({ symbol: s, tf, error: String((e && e.message) || e) }))));
    return json(res, { ok: true, tf, series });
  }
  if (p === '/api/pfseries' && req.method === 'GET') {
    // ?tf=1M&stocks=WESTLIFE.NS:2,JSL.NS:2&funds=118989:11.581 — combined
    // "today's portfolio, backtested" % series: current holdings valued at
    // each point in the window vs their value at the window start.
    const tf = TF[(u.searchParams.get('tf') || '1M').toUpperCase()] ? (u.searchParams.get('tf') || '1M').toUpperCase() : '1M';
    const stocks = (u.searchParams.get('stocks') || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 8)
      .map(x => { const i = x.lastIndexOf(':'); return { sym: i > 0 ? x.slice(0, i) : x, qty: parseFloat(i > 0 ? x.slice(i + 1) : '0') || 0 }; })
      .filter(x => x.sym && x.qty > 0);
    const funds = (u.searchParams.get('funds') || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 12)
      .map(x => { const i = x.lastIndexOf(':'); return { code: i > 0 ? x.slice(0, i) : x, units: parseFloat(i > 0 ? x.slice(i + 1) : '0') || 0 }; })
      .filter(x => /^\d+$/.test(x.code) && x.units > 0);
    if (!stocks.length && !funds.length) return json(res, { ok: false, error: 'holdings required' }, 400);
    const sig = tf + '|' + stocks.map(s => s.sym + s.qty).join(',') + '|' + funds.map(f => f.code + f.units).join(',');
    const ck = 'pf:' + sig;
    const chit = mcGet(ck, 60000);
    if (chit) return json(res, chit);
    try {
      const intraday = tf === '1D' || tf === '5D';
      const sData = (await Promise.all(stocks.map(s =>
        yahooSeries(s.sym, tf).then(r => ({ ...s, base: r.base, closes: r.closes || [] })).catch(() => null)
      ))).filter(Boolean).filter(s => s.base && s.closes.length > 1);
      const fData = (await Promise.all(funds.map(f =>
        mfNavHistory(f.code).then(rows => rows.length ? { ...f, rows, now: rows[0].nav } : null).catch(() => null)
      ))).filter(Boolean);
      let ref = [];
      sData.forEach(s => { if (s.closes.length > ref.length) ref = s.closes.map(c => c[0]); });
      if (!ref.length) { // no stocks (funds-only view): use Nifty's calendar as the time reference
        const nz = await yahooSeries('^NSEI', tf).catch(() => null);
        if (nz && nz.closes && nz.closes.length > 1) ref = nz.closes.map(c => c[0]);
      }
      if (!ref.length) return json(res, { ok: false, error: 'no series data' }, 502);
      const startTs = ref[0];
      let fundStart = 0, fundNow = 0;
      const fPos = {};
      if (tf === '1D') {
        const navs = await Promise.all(fData.map(f => mfNav(f.code).catch(() => null)));
        fData.forEach((f, i) => {
          const n = navs[i], sn = (n && n.prev_nav) || f.now, nw = (n && n.nav) || f.now;
          fPos[f.code] = { sn, nw };
          fundStart += f.units * sn; fundNow += f.units * nw;
        });
      } else {
        fData.forEach(f => {
          const sn = navAtOrBefore(f.rows, startTs) ?? f.now;
          fPos[f.code] = { sn, nw: f.now };
          fundStart += f.units * sn; fundNow += f.units * f.now;
        });
      }
      const stockStart = sData.reduce((a, s) => a + s.qty * s.base, 0);
      const baseVal = stockStart + fundStart;
      if (!(baseVal > 0)) return json(res, { ok: false, error: 'empty base' }, 502);
      const closeAt = (s, t) => { let v = s.closes[0][1]; for (const c of s.closes) { if (c[0] <= t) v = c[1]; else break; } return v; };
      const navAt = (f, t) => intraday ? fPos[f.code].nw : (navAtOrBefore(f.rows, t) ?? f.now);
      const points = ref.map(t => {
        let v = sData.reduce((a, s) => a + s.qty * closeAt(s, t), 0);
        for (const f of fData) v += f.units * navAt(f, t);
        return [t, +(((v - baseVal) / baseVal * 100).toFixed(3))];
      });
      const out = { ok: true, tf, points, start: new Date(startTs).toISOString().slice(0, 10) };
      mcSet(ck, out);
      return json(res, out);
    } catch (e) { return json(res, { ok: false, error: String((e && e.message) || e) }, 502); }
  }
  if (p === '/api/mfnav' && req.method === 'GET') { // ?codes=118989,118778 — latest MF NAVs via mfapi.in
    const codes = (u.searchParams.get('codes') || '').split(',').map(s => s.trim()).filter(s => /^\d+$/.test(s)).slice(0, 12);
    if (!codes.length) return json(res, { ok: false, error: 'codes required' }, 400);
    const navs = await Promise.all(codes.map(c => mfNav(c).catch(e => ({ code: c, error: String((e && e.message) || e) }))));
    return json(res, { ok: true, navs });
  }
  if (p === '/api/news' && req.method === 'GET') { // ?topics=Westlife+Foodworld|Jindal+Stainless — Google News RSS
    const topics = (u.searchParams.get('topics') || '').split('|').map(s => s.trim()).filter(Boolean).slice(0, 6);
    if (!topics.length) return json(res, { ok: false, error: 'topics required' }, 400);
    const feeds = await Promise.all(topics.map(async t => ({ topic: t, items: await gnews(t).catch(() => []) })));
    return json(res, { ok: true, feeds });
  }
  if (p === '/api/sentiment' && req.method === 'POST') { // {"items":[{"id","text"}]} — batch financial sentiment via phone llama-server
    const b = await readBody(req, 262144);
    if (b === null) return json(res, { ok: false, error: 'body too large' }, 413);
    const seen = new Set(), items = [];
    for (const it of (Array.isArray(b.items) ? b.items : []).slice(0, 50)) {
      const id = String((it && it.id) ?? '').slice(0, 128);
      const text = String((it && it.text) ?? '').trim().slice(0, 2000);
      if (!id || !text || seen.has(id)) continue;
      seen.add(id); items.push({ id, text });
    }
    if (!items.length) return json(res, { ok: false, error: 'items required' }, 400);
    const results = [], miss = [];
    for (const it of items) {
      const hit = mcGet('sent:v1:' + crypto.createHash('sha1').update(it.text).digest('hex'), SENT_CACHE_TTL);
      if (hit) results.push({ id: it.id, label: hit.label, score: hit.score, cached: true });
      else miss.push(it);
    }
    if (miss.length) {
      const scored = await scoreSentimentBatch(miss);
      if (scored === null) return json(res, { ok: false, error: 'scorer unreachable' }, 502);
      for (const it of miss) {
        const o = scored.get(it.id) || {};
        const label = ['positive', 'neutral', 'negative'].includes(o.label) ? o.label : 'neutral';
        const score = isFinite(+o.score) ? Math.max(0, Math.min(1, +o.score)) : 0;
        mcSet('sent:v1:' + crypto.createHash('sha1').update(it.text).digest('hex'), { label, score });
        results.push({ id: it.id, label, score });
      }
    }
    const order = new Map(items.map((it, i) => [it.id, i]));
    results.sort((a, b) => order.get(a.id) - order.get(b.id));
    return json(res, { ok: true, results });
  }

  if (p === '/api/health') return json(res, health());
  if (p === '/api/agents') return json(res, { agents: CREW, problems: [], files: [] });
  if (p === '/api/tasks' && req.method === 'GET') return json(res, tasks());
  if (p === '/api/routines' && req.method === 'GET') return json(res, routines());
  if (p === '/api/brain') return json(res, state.brain || { notes: 0, nodes: [], links: [], floor: [] });
  if (p === '/api/mcp') return json(res, { ok: true, summary: { count: 0, connected: 0 }, depts: {}, roster: {} });
  if (p === '/api/usage') return json(res, { ok: true, percent: null, tokens: 0 });
  if (p === '/api/office-state') return json(res, state);

  if (p === '/api/inbox' && req.method === 'POST') {
    const b = await readBody(req);
    if (b === null) return json(res, { ok: false, error: 'body too large' }, 413);
    const text = String(b.text || '').trim().slice(0, 2000);
    const kind = b.kind === 'task' ? 'task' : 'chat';
    const agent = String(b.agent || '').slice(0, 64);
    const dept = String(b.dept || '').slice(0, 32);
    if (!text) return json(res, { ok: false, error: 'empty text' }, 400);
    const rec = { id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8), ts: Date.now(), kind, agent, dept, text };
    try { storeInbox(rec); } catch (e) { return json(res, { ok: false, error: 'store failed' }, 500); }
    return json(res, { ok: true, id: rec.id });
  }
  if (p === '/api/replies' && req.method === 'GET') {
    return json(res, { replies: readReplies().slice(-200) });
  }

  if (p === '/api/chat' && req.method === 'POST') {
    const b = await readBody(req);
    const a = CREW.find(x => x.id === b.agent);
    return json(res, { reply: `${a ? a.name : 'CREW'} here — live chat isn't wired on the phone build yet. Ping Bhavishya on the main chat and he'll route it.` });
  }
  if (p === '/api/tasks' && req.method === 'POST') {
    const b = await readBody(req);
    return json(res, { ok: true, id: 'stub-' + Date.now(), note: 'task intake is display-only on this build' });
  }
  if ((p === '/api/routines' || p.startsWith('/api/routines/')) && req.method !== 'GET') {
    return json(res, { ok: false, error: 'routines are read-only on this build' });
  }

  res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found');
});

server.listen(PORT, '::', () => console.log(`ray office shim on [::]:${PORT} → ${OFFICE_DIR}/ and /brain/`));
