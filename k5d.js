/* K5D: visualizador de modelos GLB reais com acabamento (cor) e logo projetada (decal). ES module. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { PROC } from './proc.js';

const K5D = {};
K5D.FIN = {
  inox:   { name: 'Inox escovado', color: 0xd9dde1, metal: 1.0, rough: 0.3,  logo: '#1b1d1f' },
  preto:  { name: 'Preto fosco',   color: 0x1e2226, metal: 0.55, rough: 0.5,  logo: '#dfe3e0' },
  branco: { name: 'Branco',        color: 0xf0eee9, metal: 0.05, rough: 0.55, logo: '#15171a' },
  verde:  { name: 'Verde',         color: 0x1f8f5a, metal: 0.25, rough: 0.5,  logo: '#f2fff6' },
  azul:   { name: 'Azul marinho',  color: 0x17294f, metal: 0.3,  rough: 0.5,  logo: '#eef3ff' },
  laranja:{ name: 'Laranja',       color: 0xe0621e, metal: 0.2,  rough: 0.5,  logo: '#fff6ef' },
  cru:    { name: 'Algodão cru',   color: 0xd8cdb6, metal: 0,    rough: 0.95, logo: '#23201a' },
  madeira:{ name: 'Madeira',       color: 0xb8925a, metal: 0,    rough: 0.8,  logo: '#2a1c0a' },
  kraft:  { name: 'Kraft',         color: 0x9a7b52, metal: 0,    rough: 0.9,  logo: '#221a10' },
  vermelho:{name: 'Vermelho',      color: 0xb3271e, metal: 0.25, rough: 0.5,  logo: '#fff3f1' }
};
const loader = new GLTFLoader();
const cache = new Map();
K5D.load = function (url) {
  if (!cache.has(url)) cache.set(url, new Promise((res, rej) => { if (url.endsWith('.json')) { fetch(url).then(r => r.json()).then(j => { const bin = atob(j.b64); const arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); loader.parse(arr.buffer, '', g => res(g), rej); }).catch(rej); } else loader.load(url, g => res(g), undefined, rej); }));
  return cache.get(url);
};
/* textura da logo: quadrado com margem, opcionalmente monocromática (laser) */
K5D.logoTexture = function (img, mono, color) {
  const S = 1024; const c = document.createElement('canvas'); c.width = S; c.height = S; const g = c.getContext('2d');
  if (img) {
    const ar = img.width / img.height; let w = S * 0.86, h = w / ar; if (h > S * 0.86) { h = S * 0.86; w = h * ar; }
    let src = img;
    if (mono) { const oc = document.createElement('canvas'); oc.width = img.width; oc.height = img.height; const og = oc.getContext('2d'); og.drawImage(img, 0, 0); og.globalCompositeOperation = 'source-in'; og.fillStyle = color || '#111'; og.fillRect(0, 0, oc.width, oc.height); src = oc; }
    g.drawImage(src, (S - w) / 2, (S - h) / 2, w, h);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
};
/* normaliza: centra no chão, altura = 2 */
function normalize(root) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root); const size = box.getSize(new THREE.Vector3()); const s = 2 / Math.max(size.y, 0.0001);
  root.scale.setScalar(s); root.updateMatrixWorld(true);
  const b2 = new THREE.Box3().setFromObject(root); const c = b2.getCenter(new THREE.Vector3());
  root.position.x -= c.x; root.position.z -= c.z; root.position.y -= b2.min.y; root.position.y -= 1; // chão em y=-1, topo em y=1
  root.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(root);
}
function meshes(root) { const m = []; root.traverse(o => { if (o.isMesh && !o.userData.decal) m.push(o); }); return m; }
function bodyMeshes(root) { const m = []; root.traverse(o => { if (o.isMesh && o.userData.body) m.push(o); }); return m.length ? m : meshes(root); }
/* aplica acabamento nas malhas indicadas (por nome/regex) ou na maior malha */
function applyFinish(root, fin, spec, finName) {
  const keep = Array.isArray(spec.keepMap) ? spec.keepMap.indexOf(finName) >= 0 : spec.keepMap !== false;
  const list = meshes(root); if (!list.length) return;
  let targets = list;
  if (spec.tint) { const re = new RegExp(spec.tint, 'i'); targets = list.filter(m => re.test(m.name) || re.test(m.material && m.material.name || '')); if (!targets.length) targets = list; }
  else if (spec.tintLargest !== false) { let best = null, bv = -1; for (const m of list) { const b = new THREE.Box3().setFromObject(m); const v = b.getSize(new THREE.Vector3()); const vol = v.x * v.y * v.z; if (vol > bv) { bv = vol; best = m; } } targets = list.filter(m => { const b = new THREE.Box3().setFromObject(m); const v = b.getSize(new THREE.Vector3()); return v.x * v.y * v.z > bv * 0.25; }); if (!targets.length) targets = [best]; }
  targets.forEach(m => {
    if (!m.userData.origMat) m.userData.origMat = m.material;
    const mat = m.userData.origMat.clone(); mat.color = new THREE.Color(fin.color);
    if (!keep || !mat.map) { mat.map = null; }
    else { mat.color.multiplyScalar(1); } // mantém textura (ex.: detalhes) e tinge
    if ('metalness' in mat) { mat.metalness = fin.metal; mat.roughness = fin.rough; mat.metalnessMap = null; mat.roughnessMap = null; }
    mat.envMapIntensity = 1.2; mat.needsUpdate = true; m.material = mat;
  });
}
/* projeta a logo na frente do modelo */
function addDecal(root, logoTex, spec, box) {
  const list = bodyMeshes(root); if (!list.length || !logoTex) return null;
  const d = spec.decal || {}; const size = box.getSize(new THREE.Vector3());
  const y = box.min.y + size.y * (d.y == null ? 0.52 : d.y);
  const dir = new THREE.Vector3(...(d.dir || [0, 0, -1])).normalize(); // direção do raio
  const origin = new THREE.Vector3(box.getCenter(new THREE.Vector3()).x + (d.x || 0) * size.x, y, 0).sub(dir.clone().multiplyScalar(6));
  const ray = new THREE.Raycaster(origin, dir); const hits = ray.intersectObjects(list, false); if (!hits.length) return null;
  const h = hits[0]; const n = h.face.normal.clone().transformDirection(h.object.matrixWorld).normalize();
  const p = h.point.clone();
  const m = new THREE.Matrix4().lookAt(p.clone().add(n), p, new THREE.Vector3(0, 1, 0)); const orient = new THREE.Euler().setFromRotationMatrix(m);
  if (d.rot) orient.z += d.rot;
  const w = size.x * (d.w || 0.55), hh = w * (d.ar || 1), depth = Math.max(size.x, size.z) * 0.6;
  const geo = new DecalGeometry(h.object, p, orient, new THREE.Vector3(w, hh, depth));
  const mat = new THREE.MeshStandardMaterial({ map: logoTex, transparent: true, depthTest: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, roughness: d.rough == null ? 0.6 : d.rough, metalness: 0 });
  const mesh = new THREE.Mesh(geo, mat); mesh.userData.decal = true; mesh.renderOrder = 10; root.add(mesh);
  // decal é gerado em coordenadas de mundo: anula a transformação do root
  mesh.applyMatrix4(root.matrixWorld.clone().invert());
  return mesh;
}
let hdrCache = null;
K5D.hdr = function (url) { if (!hdrCache) hdrCache = new Promise(res => { const go = u => new RGBELoader().load(u, t => { t.mapping = THREE.EquirectangularReflectionMapping; res(t); }, undefined, () => res(null)); if (url.endsWith('.json')) { fetch(url).then(r => r.json()).then(j => { const bin = atob(j.b64); const arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); go(URL.createObjectURL(new Blob([arr], { type: 'application/octet-stream' }))); }).catch(() => res(null)); } else go(url); }); return hdrCache; };
K5D.Viewer = class {
  constructor(canvas, opts = {}) {
    this.canvas = canvas; this.opts = opts;
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: !opts.bg, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.preserve });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.dpr || 2)); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = opts.exposure || 1.1; r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; this.r = r;
    const sc = new THREE.Scene(); this.scene = sc; if (opts.bg) sc.background = new THREE.Color(opts.bg);
    const pm = new THREE.PMREMGenerator(r); sc.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose();
    if (opts.hdr) { K5D.hdr(opts.hdr).then(tex => { if (!tex) return; const pm2 = new THREE.PMREMGenerator(r); sc.environment = pm2.fromEquirectangular(tex).texture; pm2.dispose(); sc.environmentRotation && (sc.environmentRotation.y = 1.2); this.frame(performance.now()); }); }
    const cam = new THREE.PerspectiveCamera(opts.fov || 28, 1, 0.1, 50); cam.position.set(0, 0.35, opts.dist || 7); cam.lookAt(0, -0.05, 0); this.cam = cam;
    const key = new THREE.DirectionalLight(0xffffff, opts.hdr ? 1.6 : 2.6); key.position.set(3, 5, 4); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; key.shadow.radius = 10; key.shadow.camera.near = 1; key.shadow.camera.far = 20; key.shadow.camera.left = key.shadow.camera.bottom = -3; key.shadow.camera.right = key.shadow.camera.top = 3;
    const fill = new THREE.DirectionalLight(0xe8f4ee, 0.6); fill.position.set(-4, 2, 2); const rim = new THREE.DirectionalLight(opts.rim || 0xffffff, 0.7); rim.position.set(-2, 3, -5);
    sc.add(key, fill, rim, new THREE.AmbientLight(0xffffff, 0.25));
    if (opts.floor !== false) { const fl = new THREE.Mesh(new THREE.CircleGeometry(4, 48), new THREE.ShadowMaterial({ opacity: opts.shadow == null ? 0.25 : opts.shadow })); fl.rotation.x = -Math.PI / 2; fl.position.y = -1.001; fl.receiveShadow = true; sc.add(fl); }
    this.pivot = new THREE.Group(); sc.add(this.pivot); this.model = null; this.rotY = opts.rotY || 0; this.vel = 0; this.auto = opts.auto !== false; this.dragging = false; this.tiltX = 0; this.tiltTarget = 0; this.running = false; this._last = 0; this._raf = null; this.token = 0;
    let lx = 0; canvas.addEventListener('pointerdown', e => { this.dragging = true; lx = e.clientX; this.vel = 0; try { canvas.setPointerCapture(e.pointerId); } catch (_) {} }, { passive: true });
    canvas.addEventListener('pointermove', e => { if (!this.dragging) return; const dx = e.clientX - lx; lx = e.clientX; this.rotY += dx * 0.012; this.vel = dx * 0.012; }, { passive: true });
    const up = () => { this.dragging = false; }; canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('lostpointercapture', up);
    this.resize(); if (window.ResizeObserver) { this._ro = new ResizeObserver(() => { this.resize(); if (this._box) this.fit(this._box, this.spec && this.spec.fit); }); this._ro.observe(canvas); }
  }
  resize() { const c = this.canvas; const w = c.clientWidth || c.width, h = c.clientHeight || c.height; if (!w || !h) return; this.r.setSize(w, h, false); this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); }
  clear() { if (this.model) { this.pivot.remove(this.model); this.model.traverse(o => { if (o.userData.decal) { o.geometry.dispose(); o.material.map && o.material.map.dispose(); o.material.dispose(); } }); this.model = null; } }
  /* spec: {url, decal:{y,w,ar,dir,rot}, tint, rotY, scale, camY} ; state: {fin, logoImg, mono} */
  async set(spec, state = {}) {
    const tok = ++this.token; let root; const fin0 = K5D.FIN[state.fin] || K5D.FIN.preto;
    if (spec.proc) { root = PROC[spec.proc](fin0.color, spec.opt || {}); } else { const g = await K5D.load(spec.url); if (tok !== this.token) return; root = g.scene.clone(true); }
    this.clear();
    root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; if (o.material && o.material.map) o.material.map.colorSpace = THREE.SRGBColorSpace; } });
    if (spec.rotY) root.rotation.y = spec.rotY; if (spec.rotX) root.rotation.x = spec.rotX;
    const box = normalize(root); if (spec.scale) { root.scale.multiplyScalar(spec.scale); root.updateMatrixWorld(true); }
    const fin = K5D.FIN[state.fin] || null; if (fin && spec.tint !== 'none' && !spec.proc) applyFinish(root, fin, spec, state.fin);
    this.pivot.add(root); root.updateMatrixWorld(true); this.model = root; this.spec = spec;
    this.resize(); const b = new THREE.Box3().setFromObject(root); this._box = b; this.fit(b, spec.fit);
    if (state.logoImg && spec.decal !== 'none') { const col = fin ? fin.logo : '#111'; const tex = K5D.logoTexture(state.logoImg, !!state.mono, col); addDecal(root, tex, spec, b); }
    this.frame(performance.now()); return this;
  }
  fit(b, k) { const size = b.getSize(new THREE.Vector3()); const c = b.getCenter(new THREE.Vector3()); const r = Math.max(size.x, size.z) * 0.5; const h = size.y * 0.5; const fov = this.cam.fov * Math.PI / 180; const asp = this.cam.aspect || 1; const dH = h / Math.tan(fov / 2); const dW = r / Math.tan(fov / 2) / asp; const d = Math.max(dH, dW) * (k || 1.25) + r; this.cam.position.set(0, c.y + d * 0.06, d); this.cam.lookAt(0, c.y - size.y * 0.02, 0); this.camY = c.y; }
  frame(t) { const dt = Math.min(0.05, (t - this._last) / 1000 || 0.016); this._last = t; if (!this.dragging) { if (this.auto && Math.abs(this.vel) < 0.004) this.rotY += dt * 0.4; else { this.rotY += this.vel; this.vel *= 0.94; } } this.pivot.rotation.y = this.rotY; this.tiltX += (this.tiltTarget - this.tiltX) * 0.08; this.pivot.rotation.x = this.tiltX; if (this.opts.float) this.pivot.position.y = Math.sin(t / 900) * 0.05; this.r.render(this.scene, this.cam); }
  start() { if (this.running) return; this.running = true; const loop = t => { if (!this.running) return; this.frame(t); this._raf = requestAnimationFrame(loop); }; this._raf = requestAnimationFrame(loop); }
  stop() { this.running = false; if (this._raf) cancelAnimationFrame(this._raf); }
  snapshot(type = 'image/png', q) { this.frame(performance.now()); return this.canvas.toDataURL(type, q); }
};
window.K5D = K5D; window.dispatchEvent(new Event('k5d-ready'));
export default K5D;
