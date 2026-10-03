// Ray's office — crew event templates, KPIs and desk files (replaces the demo-company v1 data).
// Same exported shape: { V1, FILE_GEN, STATS, KPIS, P, rnd, ri, person, money, clockStr, slug }.
import { applyV1 } from './profile.js';

export const clockStr = () => new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:false});
export const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g,"-");
export const P = {
  first:['Bhavishya'],
  last:['Madan'],
  co:['Savita Oil Tech','Groww','ZingHR','Termux','Discord'],
  plan:['Starter','Growth'],
  competitor:['manual effort'],
  city:['Faridabad','Delhi','Noida'],
};
export const rnd = a => a[Math.floor(Math.random()*a.length)];
export const ri = (a,b) => a + Math.floor(Math.random()*(b-a+1));
export const person = () => 'Bhavishya Madan';
export const money = n => '₹'+n.toLocaleString('en-IN');

/* ---------- KPIs ---------- */
export const KPIS = [
  { id:'signals', label:'Signals Scanned', val:128, fmt:v=>v },
  { id:'builds',  label:'Builds Shipped',  val:42,  fmt:v=>v },
  { id:'notes',   label:'Notes Filed',     val:214, fmt:v=>v },
  { id:'msgs',    label:'Msgs Relayed',    val:512, fmt:v=>v },
  { id:'routed',  label:'Tasks Routed',    val:96,  fmt:v=>v },
];
export const STATS = { signals:128, builds:42, notes:214, msgs:512, routed:96 };

const chatLine = (who, text) => ({ who, text });
export const V1 = [
{ id:'radar', name:'RADAR', dept:'emails', hair:'#2b2b2b', shirt:'#5ADEB7', lead:true,
  ev:[
    {i:'🔍', t:()=>`BSE filing scan: ${ri(3,9)} insider disclosures in the 10-day window — ${ri(0,2)} promoter reshuffles flagged, rest clean`, kpi:{id:'signals',n:4}, p:4},
    {i:'📊', t:()=>`Quant research tick: 2025 OOS still grinding — simple scorer holding vs XGBoost`, p:2},
    {i:'⚠', t:()=>`Reshuffle pattern matched: buy vs sell offset on the same date — pick downgraded, never presented as clean`, p:1},
  ],
  chat:[ chatLine('agent',"Radar here. I watch the filings and the research grind — ask me what moved today."),
         chatLine('user',"anything shady in today's disclosures?"),
         chatLine('agent',"Nothing fresh beyond what we already flagged. The 10-day window is clean.") ],
  chartLbl:'Signals scanned — last 7 days', chart:[22,31,18,42,27,35,41] },
{ id:'deepscan', name:'DEEP SCAN', dept:'emails', hair:'#3b2b1d', shirt:'#5ADEB7',
  ev:[
    {i:'🛰', t:()=>`Deep scan: ${rnd(['SOTL','Shekhawati','Gandhar'])} filings re-read — ${rnd(['reshuffle confirmed','no offset found','announcement lag 1–4 days'])}`, kpi:{id:'signals',n:2}, p:3},
    {i:'📝', t:()=>`Filed scan notes to the Brain → ${rnd(['SOTL Trade Log','Insider Experiment Rules'])}`, p:1},
  ],
  chat:[ chatLine('agent',"Deep Scan. I re-read the filings nobody else bothers with.") ],
  chartLbl:'Filings re-read — last 7 days', chart:[4,7,5,9,6,8,7] },
{ id:'forge', name:'FORGE', dept:'delivery', hair:'#5a2d0c', shirt:'#8FD3F4', lead:true,
  ev:[
    {i:'🔨', t:()=>`Build shipped: ${rnd(['3D office board → phone :8082','dashboard refresh cron','BMS tester v2.9.2'])} — tested end to end`, kpi:{id:'builds',n:1}, p:4},
    {i:'🧪', t:()=>`Tests green: ${ri(180,190)}/${ri(180,190)} — no regressions`, p:2},
  ],
  chat:[ chatLine('agent',"Forge. I build the things — firmware, dashboards, bots. Tested or it didn't happen.") ],
  chartLbl:'Builds shipped — last 7 days', chart:[3,5,4,6,8,5,7] },
{ id:'firmware', name:'FIRMWARE', dept:'delivery', hair:'#1c1c2e', shirt:'#8FD3F4',
  ev:[
    {i:'⚡', t:()=>`ESP32-S3: ${rnd(['RS485 init verified against dad\u2019s golden reference','UART trace clean','NVS params saved'])}`, p:3},
    {i:'🔌', t:()=>`BMS tester v2.9.2 soak: ${ri(2400000,2600000).toLocaleString('en-IN')} polls, zero drops`, p:1},
  ],
  chat:[ chatLine('agent',"Firmware desk. Dad's mock is the golden reference — complementary, never competing.") ],
  chartLbl:'Polls (millions) — soak', chart:[1.2,1.8,2.1,2.4,2.5,2.6,2.6] },
{ id:'apps', name:'APPS', dept:'delivery', hair:'#26140a', shirt:'#8FD3F4',
  ev:[
    {i:'📱', t:()=>`Phone dashboard: ${rnd(['hotspot IP detected','static page pushed','15-min refresh healthy'])}`, p:3},
    {i:'🌐', t:()=>`Tor tunnel up — phone reachable, ssh pipe reliable`, p:1},
  ],
  chat:[ chatLine('agent',"Apps desk — dashboards, scripts, the phone link.") ],
  chartLbl:'Deploys — last 7 days', chart:[2,3,2,4,3,5,4] },
{ id:'scribe', name:'SCRIBE', dept:'sales', hair:'#2a1a0e', shirt:'#EADC8F', lead:true,
  ev:[
    {i:'📝', t:()=>`Memory log: today's entries filed — ${ri(4,9)} sections, noise filtered`, kpi:{id:'notes',n:3}, p:4},
    {i:'📊', t:()=>`Contract note parsed: ${rnd(['SOTL ×2 @ ₹702.90 — charges ₹6.95','holdings reconciled'])}`, p:2},
  ],
  chat:[ chatLine('agent',"Scribe. Docs, logs, memory — nothing gets lost on my watch.") ],
  chartLbl:'Notes filed — last 7 days', chart:[18,24,19,31,27,22,29] },
{ id:'archive', name:'ARCHIVE', dept:'sales', hair:'#141414', shirt:'#EADC8F',
  ev:[
    {i:'🗄', t:()=>`Vault indexed: 65 notes, ${ri(20,40)} wiki links — graph rebuilt`, p:2},
    {i:'🔗', t:()=>`Orphan check: every [[link]] resolves — 0 broken`, p:1},
  ],
  chat:[ chatLine('agent',"Archive. The vault is indexed and every link resolves.") ],
  chartLbl:'Vault notes', chart:[180,188,195,202,208,211,214] },
{ id:'relay', name:'RELAY', dept:'marketing', hair:'#111111', shirt:'#E69393', lead:true,
  ev:[
    {i:'💬', t:()=>`WhatsApp relay: ${ri(8,20)} messages — Bhavishya ${rnd(['online','on shift','on the hotspot'])}`, kpi:{id:'msgs',n:12}, p:4},
    {i:'🔔', t:()=>`Habit nudge ${rnd(['armed for 18:00','quiet — phone charging','sent once, no spam'])}`, p:2},
  ],
  chat:[ chatLine('agent',"Relay. WhatsApp, Discord, notifications — I'm the voice.") ],
  chartLbl:'Messages relayed — last 7 days', chart:[64,82,71,95,88,76,92] },
{ id:'pager', name:'PAGER', dept:'marketing', hair:'#7a3b12', shirt:'#E69393',
  ev:[
    {i:'📟', t:()=>`Watchdog: ${rnd(['discord-bot heartbeat fresh','tor-phone tunnel up','all crons healthy'])}`, p:3},
    {i:'✅', t:()=>`Self-heal check passed — nothing to escalate`, p:1},
  ],
  chat:[ chatLine('agent',"Pager. Watchdogs and heartbeats — I only ping when it matters.") ],
  chartLbl:'Checks passed — last 7 days', chart:[140,144,142,144,144,143,144] },
{ id:'captain', name:'CAPTAIN', dept:'ops', hair:'#101820', shirt:'#BFA2E3', lead:true,
  ev:[
    {i:'🧭', t:()=>`Routing: ${ri(1,3)} workers on ${rnd(['the 3D office','quant research','the vault'])} — main chat stays responsive`, kpi:{id:'routed',n:2}, p:4},
    {i:'⏰', t:()=>`Crons armed: ${rnd(['SOTL fill check Wed 15:45','SIP mandate check Oct 6','digest Mon–Fri 11:00'])}`, p:2},
  ],
  chat:[ chatLine('agent',"Captain. I plan the work and split it across the crew — you only see the final call.") ],
  chartLbl:'Tasks routed — last 7 days', chart:[9,12,11,14,13,15,14] },
{ id:'bhavishya', name:'BHAVISHYA', dept:'fin', hair:'#0d0d0d', shirt:'#98A5EF', lead:true,
  ev:[
    {i:'👤', t:()=>`Owner check: ${rnd(['payslip vs ₹1,600 leave cuts — Oct 10–15','SOTL fill to confirm in Groww','SIP switch live by Oct 6'])}`, p:3},
  ],
  chat:[ chatLine('agent',"The owner's desk. Money moves need his word — everything else runs itself.") ],
  chartLbl:'Approvals cleared — last 7 days', chart:[1,2,1,3,2,2,3] },
{ id:'sentinel', name:'SENTINEL', dept:'fin', hair:'#20242e', shirt:'#98A5EF',
  ev:[
    {i:'🛡', t:()=>`Money watch: ${rnd(['SOTL ×2 @ ₹702.90 — sell ₹735 live on BSE','September leave cuts ≈ ₹1,600','SIPs ₹3,800/mo → ICICI from Oct'])}`, p:3},
    {i:'💰', t:()=>`Sleeve check: ₹3–5k experiment fund intact — no averaging down, ever`, p:1},
  ],
  chat:[ chatLine('agent',"Sentinel. I watch the money — positions, cuts, SIPs. Groww is authoritative.") ],
  chartLbl:'Sleeve ₹ (experiment fund)', chart:[5000,5000,5000,3588,3588,3588,3588] },
];

export const FILE_GEN = {}; // live office: no demo files

// INDUSTRY PROFILE: no-op without window.PROFILE.
applyV1({ P, V1, FILE_GEN, clockStr });
