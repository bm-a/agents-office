// Ray edition — layout the second-brain vault → JSON consumed by ray-dashboard.py
// (embedded into office-state.json, served by the shim at /api/brain).
import { layoutGraph } from './graph-build.mjs';
import fs from 'node:fs';

const vault = process.env.VAULT || (process.env.HOME + '/workspace/second-brain');
const out = process.env.OUT || (process.env.HOME + '/workspace/ray-dashboard/brain-graph.json');

const g = await layoutGraph(vault);
if (!g.nodes.length) { console.error('vault-export: no linked notes in', vault); process.exit(1); }
fs.mkdirSync(out.slice(0, out.lastIndexOf('/')), { recursive: true });
fs.writeFileSync(out, JSON.stringify(g));
console.log(`vault-export: ${g.notes} notes, ${g.nodes.length} linked, ${g.links.length} links → ${out}`);
