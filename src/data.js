// Agents Office v2 — roster + design tokens (ported from v1 command-centre.html)
import { applyData } from './profile.js';

// Nominal.so tokens (locked design language, 30 Jul 2026)
export const TOKENS = {
  cream: '#FDFFF8',
  ink: '#151414',
  grey: '#5A5A5A',
  hairline: 'rgba(21,20,20,0.12)',
};

// Dept mapping: Support→mint, Sales→butter, Marketing→coral, Finance→periwinkle,
// Operations→violet, Brain→sage.
// NOTE (17 Aug 2026): the old 'ops' pod split in two. The accounting half kept the pod,
// the periwinkle palette and the key 'fin' (now FINANCE); Proposals + Intel moved out into
// a new 'ops' pod (OPERATIONS) alongside Legal Review, Compliance and Internal Reporting.
// V3.1 (5 Sep 2026, AJ): SUPPORT → EMAILS (same mint slot), new DELIVERY pod (sky) on the top axis.
export const DEPT_KEYS = ['emails', 'sales', 'marketing', 'ops', 'fin', 'delivery'];
export const DEPTS = {
  emails:    { name: 'RADAR',            short: 'RADAR',   chip: '#5ADEB7', ink: '#1E9070', floor: '#E9F6EF' },
  delivery:  { name: 'FORGE',            short: 'FORGE',   chip: '#8FD3F4', ink: '#2E86AB', floor: '#E6F4FB' },
  sales:     { name: 'SCRIBE',           short: 'SCRIBE',  chip: '#EADC8F', ink: '#A08A1E', floor: '#F6F1DA' },
  marketing: { name: 'RELAY',            short: 'RELAY',   chip: '#E69393', ink: '#C46060', floor: '#FAE9E7' },
  fin:       { name: 'MONEY',            short: 'MONEY',   chip: '#98A5EF', ink: '#5B66CE', floor: '#EAEDFA' },
  ops:       { name: 'COMMAND',          short: 'COMMAND', chip: '#BFA2E3', ink: '#7449A9', floor: '#F2ECFA' },
  brain:     { name: 'THE BRAIN',        short: 'THE BRAIN', chip: '#D1DECD', ink: '#4C7A57', floor: '#E9EFE4' },
};

// Ray's crew (13 desks, 6 pods). Dept keys kept stable; display names + roster are Bhavishya's.
export const AGENTS = [
  // RADAR (2) — research & scans
  { id: 'radar',    name: 'RADAR',      dept: 'emails',    lead: true,  grid: [0.5, 0], hair: '#2b2b2b', skin: '#E8B98E' },
  { id: 'deepscan', name: 'DEEP SCAN',  dept: 'emails',                 grid: [0.5, 1], hair: '#3b2b1d', skin: '#F0C9A0' },
  // FORGE (3) — builds: firmware, apps, bots
  { id: 'forge',    name: 'FORGE',      dept: 'delivery',  lead: true,  grid: [0.5, 0], hair: '#5a2d0c', skin: '#F0C9A0' },
  { id: 'firmware', name: 'FIRMWARE',   dept: 'delivery',               grid: [0, 1],   hair: '#1c1c2e', skin: '#E0A878' },
  { id: 'apps',     name: 'APPS',       dept: 'delivery',               grid: [1, 1],   hair: '#26140a', skin: '#F5D5B0' },
  // SCRIBE (2) — docs, memory, reports
  { id: 'scribe',   name: 'SCRIBE',     dept: 'sales',     lead: true,  grid: [0.5, 0], hair: '#2a1a0e', skin: '#E0A878' },
  { id: 'archive',  name: 'ARCHIVE',    dept: 'sales',                  grid: [0.5, 1], hair: '#141414', skin: '#F0C9A0' },
  // RELAY (2) — messages & notifications
  { id: 'relay',    name: 'RELAY',      dept: 'marketing', lead: true,  grid: [0.5, 0], hair: '#111111', skin: '#C68B59' },
  { id: 'pager',    name: 'PAGER',      dept: 'marketing',              grid: [0.5, 1], hair: '#7a3b12', skin: '#F5D5B0' },
  // COMMAND (1) — planning & coordination
  { id: 'captain',  name: 'CAPTAIN',    dept: 'ops',       lead: true,  grid: [0.5, 0], hair: '#101820', skin: '#F0C9A0' },
  // MONEY (2) — the owner + the watchdog
  { id: 'bhavishya', name: 'BHAVISHYA', dept: 'fin',       lead: true,  grid: [0.5, 0], hair: '#0d0d0d', skin: '#9C6B43' },
  { id: 'sentinel',  name: 'SENTINEL',  dept: 'fin',                    grid: [0.5, 1], hair: '#20242e', skin: '#D89F70' },
];

// Plinth placement in world XZ. Brain central; departments well separated (AJ: not too close at zoom-out).
export const LAYOUT = {
  brain:     { pos: [0, 0],     w: 16, d: 16 },
  emails:    { pos: [-30, -23], w: 20, d: 26 },
  delivery:  { pos: [0, -48],   w: 20, d: 30 },   // 6th pod mirrors ops on the top axis
  sales:     { pos: [30, -23],  w: 20, d: 30 },
  marketing: { pos: [-30, 23],  w: 20, d: 30 },
  fin:       { pos: [30, 23],   w: 20, d: 26 },
  ops:       { pos: [0, 48],    w: 20, d: 30 },   // the 5th pod fills the empty bottom-left gap
};

// Department billboard metrics (v1 rule #5: live metrics float above each dept,
// values tick green on change, "Waiting Approval" pulses amber when > 0).
export const BILLBOARDS = {
  emails:    [{ id: 'scans',    label: 'SIGNALS SCANNED', val: 128 }],
  delivery:  [{ id: 'builds',   label: 'BUILDS SHIPPED',  val: 42 }],
  sales:     [{ id: 'notes',    label: 'NOTES FILED',     val: 214 }],
  marketing: [{ id: 'msgs',     label: 'MSGS RELAYED',    val: 512 }],
  ops:       [{ id: 'routed',   label: 'TASKS ROUTED',    val: 96 }],
  fin:       [{ id: 'sleeve',   label: 'SLEEVE RUPEES',   val: 5000, fmt: v => '₹' + Math.round(v).toLocaleString('en-IN'), step: 50 }],
  brain:     [{ id: 'notes',    label: 'NOTES INDEXED',   val: 65, fmt: v => Math.round(v).toLocaleString('en-IN') }],
};

// Approval asks (agent requests → Bhavishya decides).
export const APPROVAL_ASKS = {
  emails:    [],
  delivery:  [],
  sales:     [],
  marketing: [],
  ops:       ['A new strategy cleared the research bar — start paper-trading it?'],
  fin:       ['Cover the missed ₹3,800 September SIPs manually in October?', 'SOTL touched ₹735 — confirm the fill in Groww before I log P&L'],
};
export const APPROVAL_BY_AGENT = {
  captain: 'A new strategy cleared the research bar — start paper-trading it?',
  bhavishya: 'Cover the missed ₹3,800 September SIPs manually in October?',
  sentinel: 'SOTL touched ₹735 — confirm the fill in Groww before I log P&L',
};

// Desk screen flavour lines — the crew's actual work.
export const WORKLINES = {
  emails: [
    '▸ scanning BSE insider filings — 10-day window',
    '▸ quant research: 2025 OOS still grinding',
    '▸ promoter reshuffle check — SOTL flagged ✓',
    '▸ 47 signals scored · 3 above the bar',
  ],
  delivery: [
    '▸ BMS tester v2.9.2 — tests 184/184 ✓',
    '▸ 3D office board → phone :8082',
    '▸ dashboard refresh — 15 min cron ✓',
    '▸ Termux sshd + tor — tunnel up',
  ],
  sales: [
    '▸ memory log — today\'s entries filed',
    '▸ second brain — vault indexed',
    '▸ report: contract note parsed ✓',
    '▸ 214 notes · graph rebuilt',
  ],
  marketing: [
    '▸ WhatsApp relay — Bhavishya online',
    '▸ Discord bridge — heartbeat fresh',
    '▸ habit nudge — quiet until 18:00',
    '▸ 512 messages relayed today',
  ],
  ops: [
    '▸ routing: 2 workers on the 3D office',
    '▸ cron check — 14 jobs healthy',
    '▸ SOTL fill check Wed 15:45 armed',
    '▸ SIP mandate check Oct 6 armed',
  ],
  fin: [
    '▸ SOTL ×2 @ ₹702.90 — sell ₹735 live',
    '▸ September leave cuts ≈ ₹1,600',
    '▸ SIPs ₹3,800/mo → ICICI from Oct',
    '▸ stipend lands Oct 10–15',
  ],
  brain: [
    '▸ indexing vault — 65 notes',
    '▸ answering RADAR query — reshuffle scan',
    '▸ note linked: SOTL Trade Log ↔ Money',
  ],
};

// INDUSTRY PROFILE (12 Sep 2026): a per-industry demo file rewrites pods, seats, rows, asks and screen lines in place. No-op without window.PROFILE.
applyData({ DEPTS, AGENTS, BILLBOARDS, APPROVAL_ASKS, APPROVAL_BY_AGENT, WORKLINES });
