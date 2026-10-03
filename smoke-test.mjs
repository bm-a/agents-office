// Smoke test: run the office bundle's module graph in Node with stubbed DOM + stubbed three.js,
// to catch top-level ReferenceErrors / TypeErrors (like the KEYS bug) before shipping to the phone.
import { build } from 'esbuild';
import fs from 'fs';

const stubThree = `
const absorb = () => new Proxy(function(){}, {
  get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : absorb()),
  set: () => true,
  apply: () => absorb(),
  construct: () => absorb(),
});
export class WebGLRenderer { constructor(){ return absorb(); } }
const _p = new Proxy(function(){}, {
  get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : _p),
  set: () => true,
  apply: () => _p,
  construct: () => _p,
});
export default _p;
for (const n of ('Scene,OrthographicCamera,PerspectiveCamera,Vector2,Vector3,Color,' +
  'HemisphereLight,DirectionalLight,AmbientLight,Mesh,PlaneGeometry,BoxGeometry,' +
  'MeshStandardMaterial,MeshBasicMaterial,ShadowMaterial,Group,Raycaster,CanvasTexture,' +
  'BufferAttribute,BufferGeometry,CapsuleGeometry,ConeGeometry,CylinderGeometry,DoubleSide,' +
  'ExtrudeGeometry,InstancedMesh,Line,LineBasicMaterial,LineDashedMaterial,LineSegments,' +
  'Object3D,Plane,QuadraticBezierCurve3,Quaternion,Shape,SphereGeometry,Sprite,SpriteMaterial,' +
  'TextureLoader').split(',')) { /* named exports below */ }
export const Scene = _p; export const OrthographicCamera = _p; export const PerspectiveCamera = _p;
export const Vector2 = _p; export const Vector3 = _p; export const Color = _p;
export const HemisphereLight = _p; export const DirectionalLight = _p; export const AmbientLight = _p;
export const Mesh = _p; export const PlaneGeometry = _p; export const BoxGeometry = _p;
export const MeshStandardMaterial = _p; export const MeshBasicMaterial = _p; export const ShadowMaterial = _p;
export const Group = _p; export const Raycaster = _p; export const CanvasTexture = _p;
export const BufferAttribute = _p; export const BufferGeometry = _p; export const CapsuleGeometry = _p;
export const ConeGeometry = _p; export const CylinderGeometry = _p; export const DoubleSide = _p;
export const ExtrudeGeometry = _p; export const InstancedMesh = _p; export const Line = _p;
export const LineBasicMaterial = _p; export const LineDashedMaterial = _p; export const LineSegments = _p;
export const Object3D = _p; export const Plane = _p; export const QuadraticBezierCurve3 = _p;
export const Quaternion = _p; export const Shape = _p; export const SphereGeometry = _p;
export const Sprite = _p; export const SpriteMaterial = _p; export const TextureLoader = _p;
export const SRGBColorSpace = 'srgb'; export const VSMShadowMap = 1; export const PCFSoftShadowMap = 2;
`;
fs.writeFileSync('/tmp/smoke-three-stub.mjs', stubThree);

const res = await build({
  entryPoints: ['src/main.js'],
  bundle: true, format: 'iife', write: false,
  target: 'es2020',
  alias: { three: '/tmp/smoke-three-stub.mjs' },
});
const js = res.outputFiles[0].text;
console.log('bundle ok,', js.length, 'bytes');

// ---- DOM stubs ----
function makeEl() {
  const el = {
    style: { setProperty(){}, removeProperty(){}, }, dataset: {}, children: [],
    classList: { add(){}, remove(){}, toggle(){}, contains: () => false },
    appendChild(c){ el.children.push(c); return c; },
    prepend(c){ el.children.unshift(c); return c; },
    append(...cs){ el.children.push(...cs); },
    insertBefore(c){ el.children.push(c); return c; },
    removeChild(c){}, insertChild(){}, insertAdjacentHTML(){},
    addEventListener(){}, removeEventListener(){},
    setAttribute(){}, getAttribute: () => null, removeAttribute(){},
    getContext: () => new Proxy({}, { get: () => () => new Proxy({}, { get: () => () => ({}) }) }),
    querySelector: () => makeEl(), querySelectorAll: () => [],
    getBoundingClientRect: () => ({ width: 800, height: 600, left: 0, top: 0 }),
    toDataURL: () => 'data:image/png;base64,stub',
    focus(){}, blur(){}, click(){}, scrollIntoView(){},
    innerHTML: '', textContent: '', value: '', width: 800, height: 600,
    clientWidth: 800, clientHeight: 600, offsetWidth: 800, offsetHeight: 600,
  };
  return el;
}
const els = {};
globalThis.document = {
  getElementById: id => (els[id] ||= makeEl()),
  createElement: () => makeEl(),
  createElementNS: () => makeEl(),
  body: makeEl(), head: makeEl(), documentElement: makeEl(),
  addEventListener(){}, removeEventListener(){},
  querySelector: () => makeEl(), querySelectorAll: () => [],
  fonts: { ready: Promise.resolve() },
  hidden: false, visibilityState: 'visible',
};
globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.innerWidth = 1280; globalThis.innerHeight = 800;
globalThis.devicePixelRatio = 2;
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};
globalThis.matchMedia = () => ({ matches: false, addEventListener(){} });
globalThis.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
globalThis.IntersectionObserver = class { observe(){} unobserve(){} disconnect(){} };
globalThis.localStorage = { getItem: () => null, setItem(){}, removeItem(){} };
globalThis.sessionStorage = globalThis.localStorage;
globalThis.fetch = async () => ({ ok: true, json: async () => ({}), text: async () => '' });
globalThis.location = { search: '', hash: '', pathname: '/office/', href: 'http://x/office/', protocol: 'http:', host: 'x' };
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node-smoke', language: 'en' }, configurable: true });
globalThis.performance = globalThis.performance || { now: () => Date.now() };

// capture errors
const errors = [];
process.on('uncaughtException', e => { errors.push('UNCAUGHT: ' + (e && e.stack || e)); });

try {
  eval(js);
} catch (e) {
  errors.push('EVAL-THROW: ' + (e && e.stack || e));
}
// let any queued microtasks run
await new Promise(r => setTimeout(r, 500));

if (errors.length) {
  console.log('SMOKE-FAIL — top-level errors:');
  for (const e of errors) console.log(e.slice(0, 2000), '\n---');
  process.exit(1);
} else {
  console.log('SMOKE-PASS — bundle evaluates with no top-level throw');
}
