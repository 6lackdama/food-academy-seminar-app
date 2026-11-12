/* Seminare 2027 – 3D-Motion-Graphic (Instagram Reel 1080×1920)
 *
 * Echtzeit-3D mit Three.js: Studiolicht, weiche Schatten, extrudierte 3D-Schrift, 3D-Karten, 3D-Broschüre.
 * Der gesprochene Text IST die Typografie der Szene (keine Untertitel): jedes Wort klappt im Sprechtakt
 * als 3D-Buchstabenblock auf. Alles hängt an einer pausierten GSAP-Timeline, deren Zeiten aus
 * src/timing.js (gemessen an der Sprachspur) kommen. window.__seek(t) rendert exakt Sekunde t.
 */
import * as THREE from 'three';
import { TTFLoader } from 'three/addons/loaders/TTFLoader.js';
import { Font } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const gsap = window.gsap;
const T = window.TIMING;
const A = '../assets/';
const W = 1080, H = 1920, FOV = 30, CAMZ = 30;
const tl = gsap.timeline({ paused: true });
const updaters = [];

// ------------------------------------------------------------------ Renderer & Studio
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('gl').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.4;

const cam = new THREE.PerspectiveCamera(FOV, W / H, 0.1, 200);
cam.position.set(0, 0, CAMZ);

const WALL_Z = -1.9;
const wallMat = new THREE.MeshStandardMaterial({ color: '#F3703A', roughness: 0.95, metalness: 0 });
const wall = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), wallMat);
wall.position.z = WALL_Z;
wall.receiveShadow = true;
scene.add(wall);

const key = new THREE.DirectionalLight('#fff4ea', 1.55);
key.position.set(-1.6, 2.6, 20);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 1, far: 70 });
key.shadow.radius = 9;
key.shadow.intensity = 0.42;
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.02;
scene.add(key);
scene.add(new THREE.HemisphereLight('#fff6ee', '#e0602c', 0.8));
const rim = new THREE.PointLight('#ffe7b0', 16, 40, 1.6);
rim.position.set(5, 9, 6);
scene.add(rim);

const world = new THREE.Group();
scene.add(world);

// ------------------------------------------------------------------ Hilfen
const makeRng = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const rnd = makeRng(2027);
const rr = (a, b) => a + (b - a) * rnd();
const segs = Object.fromEntries(T.segments.map((s) => [s.id, s]));
const segsOf = (sc) => T.segments.filter((s) => s.scene === sc);
const strip = (w) => w.toUpperCase().replace(/ß/g, 'SS').replace(/[^A-ZÄÖÜ0-9'\-]/g, '');
const std = (color, roughness = 0.4, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });

const M = {
  white: std('#ffffff', 0.32), sideO: std('#c2481d', 0.5),
  yellow: std('#FCE531', 0.28), sideY: std('#e3950f', 0.45),
  ink: std('#1d1d1b', 0.4), sideInk: std('#050505', 0.5),
  orange: std('#F3703A', 0.38),
  grey: std('#5b6066', 0.55), lightGrey: std('#c9ced3', 0.5),
  paper: std('#f6f3ec', 0.8), cardSide: std('#f1eee8', 0.6),
  gold: new THREE.MeshPhysicalMaterial({ color: '#FCE531', roughness: 0.18, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.15 }),
  glossW: new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1 }),
};
const STYLE = { w: [M.white, M.sideO], y: [M.yellow, M.sideY], k: [M.ink, M.sideInk], o: [M.orange, M.sideO] };

// ------------------------------------------------------------------ Assets
const F = {};
const TEX = {};
const texLoader = new THREE.TextureLoader();
async function loadTex(path) {
  const t = await texLoader.loadAsync(A + path);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  TEX[path] = t;
  return t;
}
function canvasTex(cv) {
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
async function svgTex(path, width) {
  const img = new Image();
  img.src = A + path;
  await img.decode();
  const vb = (await (await fetch(A + path)).text()).match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  const cv = document.createElement('canvas');
  cv.width = width; cv.height = Math.round(width * vb[3] / vb[2]);
  cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
  return canvasTex(cv);
}

// ------------------------------------------------------------------ 3D-Schrift
const geoCache = new Map();
function wordGeo(word, font) {
  const k = font + '|' + word;
  if (geoCache.has(k)) return geoCache.get(k);
  const g = new TextGeometry(word, {
    font: F[font], size: 1, depth: font === 'm' ? 0.2 : 0.3, curveSegments: 5,
    bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.02, bevelSegments: 2,
  });
  g.computeBoundingBox();
  g.translate(-g.boundingBox.min.x, 0, -0.15);
  g.userData.w = g.boundingBox.max.x - g.boundingBox.min.x;
  geoCache.set(k, g);
  return g;
}
function splits(n, r) {
  if (r === 1) return [[n]];
  const out = [];
  for (let k = 1; k <= n - r + 1; k++) splits(n - k, r - 1).forEach((rest) => out.push([k, ...rest]));
  return out;
}
/** words: [{w, t}] – t = Sprechzeitpunkt. Wählt automatisch 1–3 Zeilen für maximale Schriftgröße. */
function makeText(words, opt = {}) {
  const o = { font: 'o', maxW: 8.4, maxH: 3, maxSize: 1.2, style: 'w', hl: new Set(), hlStyle: 'y', maxRows: 3, gap: 1.08, ...opt };
  const items = words.map((x) => {
    const txt = x.w.toUpperCase().replace(/ß/g, 'SS');
    const g = wordGeo(txt, o.font);
    return { ...x, txt, g, width: g.userData.w };
  });
  const space = o.font === 'm' ? 0.42 : 0.27;
  const rowW = (row) => row.reduce((a, it) => a + it.width, 0) + space * (row.length - 1);
  let best = null;
  for (let r = 1; r <= Math.min(o.maxRows, items.length); r++) {
    for (const sp of splits(items.length, r)) {
      let i = 0;
      const rows = sp.map((k) => { const row = items.slice(i, i + k); i += k; return row; });
      const mw = Math.max(...rows.map(rowW));
      const size = Math.min(o.maxSize, o.maxW / mw, o.maxH / (r * o.gap));
      if (!best || size > best.size * 1.12) best = { rows, size, mw };
    }
  }
  const group = new THREE.Group();
  group.visible = false;
  const ws = [];
  best.rows.forEach((row, ri) => {
    let x = -rowW(row) / 2;
    const y = ((best.rows.length - 1) / 2 - ri) * o.gap - 0.36;
    row.forEach((it) => {
      const isHl = o.hl.has(strip(it.w));
      const mesh = new THREE.Mesh(it.g, STYLE[isHl ? o.hlStyle : o.style]);
      mesh.castShadow = true;
      const piv = new THREE.Group();
      piv.position.set(x + it.width / 2, y, 0);
      mesh.position.x = -it.width / 2;
      piv.add(mesh);
      group.add(piv);
      ws.push({ piv, t: it.t ?? 0, hl: isHl });
      x += it.width + space;
    });
  });
  group.scale.setScalar(best.size);
  return { group, words: ws, width: best.mw * best.size, height: best.rows.length * o.gap * best.size, size: best.size };
}
const lineWords = (line) => line.words.filter((x) => x.w !== '–').map((x) => ({ w: x.w.replace(/–/g, ''), t: x.s }));

/** Wörter klappen im Sprechtakt aus der Tiefe nach oben */
function textIn(txt, tShow, mode = 'flip') {
  tl.set(txt.group, { visible: true }, tShow);
  txt.words.forEach((wd) => {
    const t = Math.max(tShow, wd.t - 0.08);
    if (mode === 'punch') {
      tl.fromTo(wd.piv.scale, { x: 0.01, y: 0.01, z: 0.01 }, { x: 1, y: 1, z: 1, duration: 0.55, ease: 'back.out(2.4)' }, t);
      tl.fromTo(wd.piv.rotation, { y: 1.2, z: -0.5 }, { y: 0, z: 0, duration: 0.6, ease: 'back.out(1.8)' }, t);
    } else if (mode === 'slam') {
      tl.fromTo(wd.piv.position, { z: 9 }, { z: 0, duration: 0.5, ease: 'expo.out' }, t);
      tl.fromTo(wd.piv.scale, { x: 0.01, y: 0.01, z: 0.01 }, { x: 1, y: 1, z: 1, duration: 0.2, ease: 'power2.out' }, t);
    } else {
      tl.fromTo(wd.piv.rotation, { x: -1.55 }, { x: 0, duration: 0.7, ease: 'back.out(1.6)' }, t);
      tl.fromTo(wd.piv.position, { z: 1.6 }, { z: 0, duration: 0.6, ease: 'expo.out' }, t);
      tl.fromTo(wd.piv.scale, { x: 0.01, y: 0.01, z: 0.01 }, { x: 1, y: 1, z: 1, duration: 0.28, ease: 'power2.out' }, t);
    }
  });
}
function textOut(txt, t) {
  const n = txt.words.length;
  txt.words.forEach((wd, i) => {
    tl.to(wd.piv.rotation, { x: 1.5, duration: 0.3, ease: 'power2.in' }, t + i * 0.022);
    tl.to(wd.piv.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.3, ease: 'power2.in' }, t + i * 0.022);
  });
  tl.set(txt.group, { visible: false }, t + 0.32 + n * 0.022);
}

// ------------------------------------------------------------------ Bausteine
function sticker(name, parent, x, y, h, z = 0.7) {
  const tex = TEX[`sb/${name}.webp`];
  const asp = tex.image.width / tex.image.height;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(h * asp, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.4, toneMapped: false }));
  m.castShadow = true;
  m.position.y = h / 2;
  const piv = new THREE.Group();
  piv.position.set(x, y - h / 2, z);
  piv.scale.setScalar(0.01);
  piv.add(m);
  parent.add(piv);
  const ph = rr(0, 6);
  updaters.push((t) => { m.rotation.z = Math.sin(t * 2.1 + ph) * 0.045; m.position.y = h / 2 + Math.sin(t * 2.6 + ph) * 0.07; m.rotation.y = Math.sin(t * 0.9 + ph) * 0.12; });
  return piv;
}
function cutout(path, parent, x, y, w, z = -0.6) {
  const tex = TEX[path];
  const h = w * tex.image.height / tex.image.width;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.45, toneMapped: false }));
  m.castShadow = true;
  const piv = new THREE.Group();
  piv.position.set(x, y, z);
  piv.scale.setScalar(0.01);
  piv.add(m);
  parent.add(piv);
  const ph = rr(0, 6);
  updaters.push((t) => { m.rotation.z = Math.sin(t * 0.9 + ph) * 0.08; m.position.y = Math.sin(t * 1.3 + ph) * 0.12; });
  return piv;
}
function pop(piv, t, dur = 0.7, rot = -0.35) {
  tl.fromTo(piv.scale, { x: 0.01, y: 0.01, z: 0.01 }, { x: 1, y: 1, z: 1, duration: dur, ease: 'back.out(1.7)' }, t);
  tl.fromTo(piv.rotation, { z: rot }, { z: 0, duration: dur, ease: 'back.out(1.7)' }, t);
}
function unpop(piv, t, dur = 0.3) { tl.to(piv.scale, { x: 0.01, y: 0.01, z: 0.01, duration: dur, ease: 'back.in(1.7)' }, t); }

/** 3D-Tafel (abgerundete Platte) mit Canvas-Bild auf der Vorderseite */
function slab(w, h, d, drawFn, side = M.cardSide, radius = 0.22) {
  const cvW = 1400, cvH = Math.round(1400 * h / w);
  const cv = document.createElement('canvas');
  cv.width = cvW; cv.height = cvH;
  drawFn(cv.getContext('2d'), cvW, cvH);
  const front = new THREE.MeshBasicMaterial({ map: canvasTex(cv), toneMapped: false });
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, radius), [side, side, side, side, front, side]);
  mesh.castShadow = true;
  return mesh;
}
function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function contain(ctx, img, x, y, w, h) {
  const k = Math.min(w / img.width, h / img.height);
  ctx.drawImage(img, x + (w - img.width * k) / 2, y + (h - img.height * k) / 2, img.width * k, img.height * k);
}
function coverImg(ctx, img, x, y, w, h) {
  const k = Math.max(w / img.width, h / img.height);
  ctx.drawImage(img, x + (w - img.width * k) / 2, y + (h - img.height * k) / 2, img.width * k, img.height * k);
}
const OPAQUE = ['24', '29', '30', '31'];
function seminarCard(nr, photo = false) {
  const img = TEX[photo ? `pages/${nr}.webp` : `titles/${nr}.webp`].image;
  const w = photo ? 5.5 : 7.6, h = photo ? 5.5 : 4.3;
  const mesh = slab(w, h, 0.18, (ctx, cw, ch) => {
    ctx.fillStyle = OPAQUE.includes(nr) ? '#F3703A' : '#ffffff';
    ctx.fillRect(0, 0, cw, ch);
    if (photo) coverImg(ctx, img, 0, 0, cw, ch); else contain(ctx, img, cw * 0.07, ch * 0.1, cw * 0.86, ch * 0.8);
    ctx.fillStyle = '#1d1d1b';
    ctx.beginPath(); ctx.arc(110, 110, 70, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FCE531';
    ctx.font = '900 70px Outfit'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(nr, 110, 114);
  });
  const piv = new THREE.Group();
  piv.add(mesh);
  piv.visible = false;
  return piv;
}
function pill(text, { bg = M.ink, style = 'y', size = 0.36 } = {}) {
  const txt = makeText(text.split(' ').map((w) => ({ w })), { maxSize: size, maxW: 20, maxRows: 1, style });
  txt.group.visible = true;
  const g = new THREE.Group();
  const box = new THREE.Mesh(new RoundedBoxGeometry(txt.width + size * 1.6, size * 1.9, 0.3, 4, size * 0.9), bg);
  box.castShadow = true;
  box.position.z = -0.18;
  txt.group.position.y = size * 0.03;
  g.add(box, txt.group);
  return g;
}
function heartShape(s = 1) {
  const sh = new THREE.Shape();
  sh.moveTo(0, -1.0 * s);
  sh.bezierCurveTo(-1.55 * s, 0.05 * s, -1.0 * s, 1.25 * s, 0, 0.62 * s);
  sh.bezierCurveTo(1.0 * s, 1.25 * s, 1.55 * s, 0.05 * s, 0, -1.0 * s);
  return sh;
}
function heartMesh(size, mat, depth = 0.35) {
  const g = new THREE.ExtrudeGeometry(heartShape(size), { depth: depth * size, bevelEnabled: true, bevelThickness: 0.14 * size, bevelSize: 0.12 * size, bevelSegments: 5, curveSegments: 28 });
  g.center();
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  return m;
}
function heartRing(size, mat) { // Herz-Kontur wie in der Broschüre
  const outer = heartShape(size);
  const inner = heartShape(size * 0.76);
  outer.holes.push(new THREE.Path(inner.getPoints(60).map((p) => new THREE.Vector2(p.x, p.y + size * 0.04)).reverse()));
  const g = new THREE.ExtrudeGeometry(outer, { depth: 0.25 * size, bevelEnabled: true, bevelThickness: 0.08 * size, bevelSize: 0.05 * size, bevelSegments: 4, curveSegments: 40 });
  g.center();
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  return m;
}

// ------------------------------------------------------------------ Szenen-Gruppen, Übergänge, Kamera
function shot() { const g = new THREE.Group(); g.visible = false; world.add(g); return g; }
function shotIn(g, t, type = 'slam') {
  tl.set(g, { visible: true }, t);
  const d = 0.85;
  if (type === 'slam') {
    tl.fromTo(g.position, { x: 0, y: 0, z: 18 }, { x: 0, y: 0, z: 0, duration: d, ease: 'expo.out' }, t);
    tl.fromTo(g.rotation, { x: 0, y: 0, z: -0.25 }, { z: 0, duration: d, ease: 'expo.out' }, t);
  } else if (type === 'right') {
    tl.fromTo(g.position, { x: 13, y: 0, z: 2 }, { x: 0, z: 0, duration: d, ease: 'expo.out' }, t);
    tl.fromTo(g.rotation, { x: 0, y: -1.0, z: 0 }, { y: 0, duration: d, ease: 'expo.out' }, t);
  } else if (type === 'up') {
    tl.fromTo(g.position, { x: 0, y: -19, z: 0 }, { y: 0, duration: d, ease: 'expo.out' }, t);
    tl.fromTo(g.rotation, { x: 0.7, y: 0, z: 0 }, { x: 0, duration: d, ease: 'expo.out' }, t);
  }
}
function shotOut(g, t, type = 'left') {
  const d = 0.5;
  if (type === 'left') {
    tl.to(g.position, { x: -13, z: 2, duration: d, ease: 'power3.in' }, t);
    tl.to(g.rotation, { y: 1.0, duration: d, ease: 'power3.in' }, t);
  } else if (type === 'up') {
    tl.to(g.position, { y: 19, duration: d, ease: 'power3.in' }, t);
    tl.to(g.rotation, { x: -0.7, duration: d, ease: 'power3.in' }, t);
  } else if (type === 'past') {
    tl.to(g.position, { z: 26, duration: d, ease: 'power3.in' }, t);
  }
  tl.set(g, { visible: false }, t + d + 0.02);
}
const rig = { x: 0, y: 0, z: 0 };
function punch(t, k = 2.4) { tl.fromTo(rig, { z: -k }, { z: 0, duration: 0.55, ease: 'power3.out', immediateRender: false }, t); }
updaters.push((t) => {
  cam.position.set(Math.sin(t * 0.31) * 0.8 + rig.x, Math.cos(t * 0.23) * 0.5 + rig.y, CAMZ + rig.z);
  cam.lookAt(rig.x * 0.4, rig.y * 0.4, 0);
});

/** Konfetti – Position wird pro Bild aus der Zeit berechnet (deterministisch) */
function confetti(t0, x, y, n = 70, spread = 4.2) {
  const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.15, 0.26), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), n);
  const cols = ['#FCE531', '#ffffff', '#1d1d1b', '#FCE531', '#ffd27a'].map((c) => new THREE.Color(c));
  const P = [...Array(n)].map((_, i) => ({ vx: rr(-spread, spread), vy: rr(5, 11), vz: rr(0, 5), sp: rr(-9, 9), ax: rr(0, 6), c: cols[i % cols.length] }));
  P.forEach((p, i) => im.setColorAt(i, p.c));
  im.visible = false;
  im.castShadow = true;
  im.frustumCulled = false;
  scene.add(im);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pos = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
  updaters.push((t) => {
    const dt = t - t0;
    im.visible = dt >= 0 && dt < 2.8;
    if (!im.visible) return;
    const drag = (1 - Math.exp(-dt * 1.6)) / 1.6;
    P.forEach((p, i) => {
      pos.set(x + p.vx * drag * 1.4, y + p.vy * drag - 2.9 * dt * dt, 1 + p.vz * drag);
      e.set(p.ax + dt * p.sp, dt * p.sp * 0.7, p.ax);
      q.setFromEuler(e);
      m4.compose(pos, q, sc);
      im.setMatrixAt(i, m4);
    });
    im.instanceMatrix.needsUpdate = true;
  });
}

/** Farbe der Studiowand über die Zeit */
const wallKeys = [];
function wallColor(t, color, dur = 0) { wallKeys.push({ t, c: new THREE.Color(color), dur }); }
updaters.push((t) => {
  const c = wallKeys[0].c.clone();
  for (const k of wallKeys) {
    if (t < k.t) break;
    const p = k.dur ? Math.min(1, (t - k.t) / k.dur) : 1;
    c.lerp(k.c, p * p * (3 - 2 * p));
  }
  wallMat.color.copy(c);
});

// ================================================================== Gesprochener Text als Szenen-Typo
const HL = {
  's01:2': ['Fresh-Trainer'], 's02:0': ['2027'], 's02:1': ['Frischetheke'], 's03:0': ['Menschen'], 's03:1': ['Unterschied'],
  's05:0': ['Quereinsteiger'], 's05:1': ['Profi'], 's05:3': ['kurz'],
  's07:0': ['Onboarding'], 's07:1': ['Durchstarten'], 's07:2': ['Grundlagen'], 's07:3': ['online'], 's07:4': ['Heimspielserie'],
  's09:0': ['Fleisch', 'Profil'], 's09:1': ['Grillschule'], 's09:2': ['Bratenschule'], 's09:4': ['Profis'], 's09:5': ['Meat', 'Masterclass'],
  's11:0': ['Wurst', 'Schinken'], 's11:1': ['Welt'], 's11:3': ['Food', 'Stylist'], 's11:4': ['Platten', 'Fingern'],
  's13:0': ['kulinarische', 'Reise'], 's13:1': ['Fromage', 'Voyage'], 's13:2': ['Käse-Masterclass'],
  's15:0': ["Rock'", 'Küche', 'Fisch'], 's15:1': ['hautnah'],
  's17:0': ['Führungstraining'], 's17:1': ['eins', 'zwei', 'drei'], 's17:2': ['Ausbilderschein'], 's17:3': ['Meisterpflicht'],
  's19:1': ['Hands', 'Meat'], 's19:2': ['Handwerk'], 's19:3': ['Ausbildung'],
  's21:0': ['100', 'Handgriffe'], 's21:1': ['Blended', 'Learning'], 's21:2': ['WizzUp', 'Quiz-Duell'],
  's22:1': ['Marktleitung'], 's23:1': ['Broschüre'], 's23:2': ['Theke'],
};
const PUNCH = new Set(['s02:2', 's05:2', 's09:3', 's11:2', 's13:3', 's15:2', 's17:4', 's19:0', 's19:4']);
const hlOf = (key) => new Set((HL[key] || []).map(strip));
function say(seg, i, parent, { x = 0, y = 5.1, z = 0.4, maxW = 8.5, maxH = 2.6, maxSize = 1.15, mode, style = 'w' } = {}) {
  const key = `${seg.id}:${i}`;
  const isPunch = PUNCH.has(key);
  const txt = makeText(lineWords(seg.lines[i]), isPunch
    ? { font: 'm', style: 'y', maxW: maxW * 0.9, maxH, maxSize: maxSize * 1.15 }
    : { style, hl: hlOf(key), maxW, maxH, maxSize });
  txt.group.position.set(x, y, z);
  if (isPunch) txt.group.rotation.z = 0.06;
  parent.add(txt.group);
  textIn(txt, seg.lines[i].s - 0.12, mode || (isPunch ? 'punch' : 'flip'));
  return txt;
}
/** Satzteile nacheinander in derselben Zone – jeder ersetzt den vorherigen */
function sayAll(seg, parent, opts, from = 0, to = seg.lines.length) {
  const out = [];
  for (let i = from; i < to; i++) {
    const txt = say(seg, i, parent, typeof opts === 'function' ? opts(i) : opts);
    out.push(txt);
    if (i < to - 1) textOut(txt, seg.lines[i + 1].s - 0.34);
  }
  return out;
}
const boundary = (seg) => Math.max(T.segments[T.segments.indexOf(seg) - 1].end + 0.05, seg.start - 0.38);

// ================================================================== BUILD
function build() {
  // ---- Deko: schwebende 3D-Herzen an der Studiowand
  [[-4.2, 7.5, 0.4, M.glossW], [4.1, 3.4, 0.38, M.gold], [-4.2, -1.5, 0.42, M.gold], [4.0, -6.2, 0.6, M.glossW], [-3.2, -6.9, 0.3, M.glossW], [3.6, 7.3, 0.28, M.gold]]
    .forEach(([x, y, s, mat], i) => {
      const h = heartMesh(s, mat);
      h.position.set(x, y, -1.25);
      scene.add(h);
      const ph = i * 1.7;
      updaters.push((t) => { h.rotation.y = Math.sin(t * 0.7 + ph) * 0.7; h.rotation.z = Math.sin(t * 0.5 + ph) * 0.2; h.position.y = y + Math.sin(t * 0.8 + ph) * 0.25; });
    });

  // ---- Hook: NEU / 2027 / FRESH
  wallColor(0, '#ffffff'); wallColor(0.3, '#1d1d1b'); wallColor(0.6, '#FCE531'); wallColor(0.9, '#F3703A');
  [['NEU', 'o'], ['2027', 'y'], ['FRESH', 'k']].forEach(([w, style], i) => {
    const txt = makeText([{ w, t: i * 0.3 }], { style, maxSize: 3.4, maxW: 8.6 });
    scene.add(txt.group);
    textIn(txt, i * 0.3, 'slam');
    tl.set(txt.group, { visible: false }, (i + 1) * 0.3);
    punch(i * 0.3, 3);
  });

  // ================= 1) INTRO
  const intro = shot();
  {
    const s = segs.s01;
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4 * TEX.logo.image.height / TEX.logo.image.width), new THREE.MeshBasicMaterial({ map: TEX.logo, transparent: true, toneMapped: false }));
    logo.position.set(0, 6.55, 0.2);
    logo.castShadow = true;
    intro.add(logo);
    const ring = heartRing(3.2, M.glossW);
    ring.position.set(0, -0.9, -1.2);
    intro.add(ring);
    updaters.push((t) => { ring.rotation.y = Math.sin(t * 0.8) * 0.35; });
    const sb = sticker('winken', intro, 0, -1.4, 6.6, 0.6);
    shotIn(intro, 0.85, 'slam');
    tl.fromTo(logo.position, { y: 9.5 }, { y: 6.55, duration: 0.8, ease: 'expo.out' }, 1.0);
    tl.fromTo(ring.scale, { x: 0.01, y: 0.01, z: 0.01 }, { x: 1, y: 1, z: 1, duration: 0.9, ease: 'back.out(1.6)' }, 0.95);
    pop(sb, 1.05, 0.8);
    sayAll(s, intro, { y: 3.95, maxSize: 1.2 });
    punch(s.lines[0].s, 1.6);
  }

  // ================= 2) COVER – 3D-Broschüre
  const coverShot = shot();
  {
    const s = segs.s02;
    const bk = makeBook();
    bk.group.position.set(0, -0.6, 0);
    bk.group.scale.setScalar(1.08);
    coverShot.add(bk.group);
    const sb = sticker('party', coverShot, 2.9, -4.7, 3.3, 1.3);
    const tB = boundary(s);
    shotOut(intro, tB, 'left');
    shotIn(coverShot, tB, 'right');
    tl.fromTo(bk.group.rotation, { y: -2.6, x: -0.5 }, { y: 0.35, x: -0.12, duration: 1.4, ease: 'expo.out' }, tB);
    tl.to(bk.group.rotation, { y: -0.3, duration: 2.6, ease: 'sine.inOut' }, tB + 1.4);
    sayAll(s, coverShot, { y: 5.35, maxSize: 1.25 });
    const tDa = s.lines[2].s;
    pop(sb, tDa - 0.1);
    confetti(tDa, 0, 0.5);
    punch(tDa, 2);
  }

  // ================= 3) MENSCHEN – also: DU!
  const people = shot();
  {
    const s = segs.s03;
    const tB = boundary(s);
    shotOut(coverShot, tB, 'past');
    shotIn(people, tB, 'slam');
    const a = say(s, 0, people, { y: 3.0, maxSize: 1.6 });
    const b = say(s, 1, people, { y: 0.9, maxSize: 1.25 });
    const tDu = s.lines[2].s;
    textOut(a, tDu - 0.4); textOut(b, tDu - 0.35);
    const heart = heartMesh(2.4, M.gold, 0.45);
    heart.position.set(0, 0.6, -0.9);
    heart.visible = false;
    people.add(heart);
    tl.set(heart, { visible: true }, tDu - 0.1);
    tl.fromTo(heart.scale, { x: 0.01, y: 0.01, z: 0.01 }, { x: 1, y: 1, z: 1, duration: 0.8, ease: 'elastic.out(1, 0.55)' }, tDu - 0.1);
    updaters.push((t) => { heart.rotation.y = t < tDu - 0.1 ? -3 : (t < tDu + 0.9 ? -3 * Math.pow(1 - (t - tDu + 0.1), 3) : Math.sin((t - tDu - 0.9) * 1.2) * 0.25); });
    const du = makeText(lineWords(s.lines[2]), { hl: new Set(['DU!', 'DU']), maxSize: 2.6, maxW: 8.4, maxRows: 2 });
    du.group.position.set(0, 1.2, 0.9);
    people.add(du.group);
    textIn(du, tDu - 0.12, 'slam');
    punch(tDu + 0.25, 3);
    const sb = sticker('zeigt', people, -2.6, -4.6, 3.4, 1.4);
    pop(sb, tDu + 0.3);
  }

  // ================= 4) LEVEL
  const level = shot();
  {
    const s4 = segs.s04, s5 = segs.s05;
    const tB = boundary(s4);
    shotOut(people, tB, 'up');
    shotIn(level, tB, 'up');
    const title = say(s4, 0, level, { y: 5.2, maxSize: 1.5 });
    const names = ['FRESH-LING', 'FRESH-KRAFT', 'FRESH-ALIST', 'FRESH-MASTER'];
    const bars = names.map((n, i) => {
      const wd = 5.0 + i * 1.15;
      const g = new THREE.Group();
      const bar = new THREE.Mesh(new RoundedBoxGeometry(wd, 1.32, 0.55, 4, 0.2), M.grey);
      bar.castShadow = true;
      bar.position.x = wd / 2;
      g.add(bar);
      for (let k = 0; k < 4; k++) {
        const h = heartMesh(0.21, k <= i ? M.gold : M.lightGrey, 0.5);
        h.position.set(wd - 3.15 + k * 0.62, 0.26, 0.38);
        g.add(h);
      }
      const lab = pill(n, { bg: M.orange, style: 'w', size: 0.26 });
      lab.position.set(wd - 2.22, -0.33, 0.33);
      g.add(lab);
      g.position.set(-5.6, -2.3 + i * 1.62, 0);
      g.visible = false;
      level.add(g);
      const t = s4.lines[i + 1].s - 0.15;
      tl.set(g, { visible: true }, t);
      tl.fromTo(g.position, { x: -14 }, { x: -5.6, duration: 0.75, ease: 'expo.out' }, t);
      tl.fromTo(lab.scale, { x: 1, y: 1 }, { x: 1.2, y: 1.2, duration: 0.18, yoyo: true, repeat: 1, ease: 'sine.inOut', immediateRender: false }, t + 0.45);
      return g;
    });
    const think = sticker('denkt', level, 3.2, -4.6, 3.0, 1.2);
    pop(think, s4.lines[0].s + 0.2);
    textOut(title, s5.lines[0].s - 0.34);
    sayAll(s5, level, (i) => (i === 3 ? { y: 2.6, maxSize: 1.5, maxH: 3.4 } : { y: 5.2, maxSize: 1.15 }));
    const tUp = s5.lines[2].s;
    unpop(think, tUp - 0.15);
    const dance = sticker('tanzen', level, 3.2, -4.5, 3.2, 1.2);
    pop(dance, tUp);
    confetti(tUp, 1, 2);
    punch(tUp, 2);
    const tK = s5.lines[3].s - 0.3;
    bars.forEach((b, i) => tl.to(b.position, { x: -15, duration: 0.45, ease: 'power3.in' }, tK - 0.1 + i * 0.04));
    unpop(dance, tK);
    const idea = sticker('idee', level, 0, -3.3, 4.6, 1.0);
    pop(idea, tK + 0.25);
  }

  // ================= 5–11) THEMEN: Frage → Antwort mit 3D-Karten
  const CATS = [
    { scene: 'onboarding', name: 'START', qsb: 'schulterzucken', sb: 'fingerpistole', food: ['img/petersilie.webp', 'food/p05_308.webp'] },
    { scene: 'fleisch', name: 'FLEISCH', qsb: 'grill', sb: 'grill2', food: ['food/p05_364.webp', 'food/p17_1098.webp'] },
    { scene: 'wurst', name: 'WURST', qsb: 'koch-loeffel', sb: 'koch', food: ['food/p20_1257.webp', 'food/p03_145.webp'] },
    { scene: 'kaese', name: 'KÄSE', qsb: 'verliebt', sb: 'klatschen', food: ['food/p24_1408.webp', 'food/p21_1277.webp'] },
    { scene: 'fisch', name: 'FISCH', qsb: 'schock', sb: 'achtung', food: ['food/p26_1450.webp', 'food/p38_1906.webp'] },
    { scene: 'fuehrung', name: 'FÜHRUNG', qsb: 'stark', sb: 'daumen', food: ['food/p29_1556.webp'] },
    { scene: 'azubis', name: 'AUSBILDUNG', qsb: 'verlegen', sb: 'winken2', swap: [4, 'party2'], photo: true, food: [] },
  ];
  let prev = level;
  CATS.forEach((c, ci) => {
    const [qs, as] = segsOf(c.scene);
    // ---- Frage
    const q = shot();
    const tQ = boundary(qs);
    shotOut(prev, tQ, 'left');
    shotIn(q, tQ, 'right');
    const qw = lineWords(qs.lines[0]);
    const small = makeText(qw.slice(0, -1), { maxSize: 0.85, maxW: 8.4, maxRows: 1 });
    small.group.position.set(0, 4.55, 0.3);
    q.add(small.group);
    textIn(small, qs.lines[0].s - 0.12);
    const big = makeText(qw.slice(-1), { style: 'y', maxSize: 2.7, maxW: 8.6, maxRows: 1 });
    big.group.position.set(0, 2.3, 0.6);
    q.add(big.group);
    textIn(big, qs.lines[0].s - 0.12, 'slam');
    punch(qw[qw.length - 1].t, 2.6);
    const tag = pill(`THEMA ${ci + 1}/7`, { size: 0.3 });
    tag.position.set(0, 6.3, 0.3);
    q.add(tag);
    tl.fromTo(tag.scale, { x: 0.01, y: 0.01, z: 0.01 }, { x: 1, y: 1, z: 1, duration: 0.6, ease: 'back.out(2)' }, tQ + 0.3);
    const qsb = sticker(c.qsb, q, 0, -2.4, 4.9, 1.0);
    pop(qsb, tQ + 0.4, 0.8);
    c.food.forEach((f, i) => {
      const fo = cutout(f, q, i ? 3.3 : -3.3, -3.3 + (i ? 0.4 : 0), 3.2, -0.4);
      pop(fo, tQ + 0.55 + i * 0.12, 0.8, i ? 0.6 : -0.6);
    });
    // ---- Antwort
    const a = shot();
    const tA = boundary(as);
    shotOut(q, tA, 'up');
    shotIn(a, tA, 'up');
    const catTag = pill(`${ci + 1}/7 · ${c.name}`, { size: 0.32 });
    catTag.position.set(0, 7.0, 0.3);
    a.add(catTag);
    const sb = sticker(c.sb, a, 3.15, -4.55, 3.2, 1.4);
    pop(sb, tA + 0.5);
    if (c.swap) {
      const t = as.lines[c.swap[0]].s - 0.12;
      unpop(sb, t);
      const sb2 = sticker(c.swap[1], a, 3.0, -4.45, 3.5, 1.4);
      pop(sb2, t + 0.1);
      confetti(t + 0.15, 2.5, -2.5, 50, 3);
    }
    c.food.forEach((f, i) => {
      const fo = cutout(f, a, i ? 3.7 : -3.5, i ? 2.9 : -4.0, i ? 2.4 : 3.2, -0.8);
      pop(fo, tA + 0.45 + i * 0.12, 0.8);
    });
    sayAll(as, a, { y: 5.15, maxSize: 1.12, maxH: 2.3 });
    const cl = as.lines.map((l, i) => ({ l, i })).filter((x) => x.l.card);
    const cards = cl.map(({ l }) => { const k = seminarCard(l.card, c.photo); k.position.set(0, c.photo ? 0.55 : 0.75, 0); a.add(k); return k; });
    cards.forEach((k, j) => {
      const t = cl[j].l.s - 0.18;
      tl.set(k, { visible: true }, t);
      tl.fromTo(k.position, { x: 10, z: 4 }, { x: 0, z: 0, duration: 0.85, ease: 'expo.out' }, t);
      tl.fromTo(k.rotation, { y: -1.25, z: -0.25, x: 0.2 }, { y: j % 2 ? 0.1 : -0.1, z: j % 2 ? 0.03 : -0.03, x: 0, duration: 0.95, ease: 'expo.out' }, t);
      if (cards[j + 1]) {
        const tn = cl[j + 1].l.s - 0.18;
        tl.to(k.position, { x: -10.5, z: -0.5, duration: 0.6, ease: 'power3.in' }, tn - 0.05);
        tl.to(k.rotation, { y: 1.2, z: 0.2, duration: 0.6, ease: 'power3.in' }, tn - 0.05);
        tl.set(k, { visible: false }, tn + 0.6);
      }
      punch(t + 0.1, 1.2);
    });
    prev = a;
  });

  // ================= 12) FRESH DIGITAL (dunkles Studio)
  {
    const [qs, as] = segsOf('digital');
    const q = shot();
    const tQ = boundary(qs);
    shotOut(prev, tQ, 'left');
    shotIn(q, tQ, 'right');
    wallColor(tQ, '#2a2f33', 0.5);
    const qw = lineWords(qs.lines[0]);
    const small = makeText(qw.slice(0, -1), { maxSize: 1.1, maxW: 8.4, maxRows: 1 });
    small.group.position.set(0, 4.7, 0.3);
    q.add(small.group);
    textIn(small, qs.lines[0].s - 0.12);
    const big = makeText(qw.slice(-1), { style: 'y', maxSize: 2.4, maxW: 8.7, maxRows: 1 });
    big.group.position.set(0, 2.7, 0.6);
    q.add(big.group);
    textIn(big, qs.lines[0].s - 0.05, 'slam');
    punch(qs.lines[0].s + 0.3, 2.4);
    const zz = sticker('schlafen2', q, 0, -2.6, 5.0, 1.0);
    pop(zz, tQ + 0.4, 0.8);

    const a = shot();
    const tA = boundary(as);
    shotOut(q, tA, 'up');
    shotIn(a, tA, 'up');
    const fd = TEX['img/fresh-digital.webp'];
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2 * fd.image.height / fd.image.width), new THREE.MeshBasicMaterial({ map: fd, transparent: true, toneMapped: false }));
    logo.position.set(0, 7.05, 0.3);
    a.add(logo);
    sayAll(as, a, { y: 4.55, maxSize: 0.95, maxH: 1.75 });
    [drawTile100, drawTileBlended, drawTileWizz].forEach((fn, i) => {
      const p = new THREE.Group();
      p.add(slab(8.2, 2.25, 0.3, fn, M.ink, 0.3));
      p.position.set(0, 1.85 - i * 2.55, 0);
      p.visible = false;
      a.add(p);
      const t = as.lines[i].s - 0.15;
      tl.set(p, { visible: true }, t);
      tl.fromTo(p.position, { x: i % 2 ? 11 : -11 }, { x: 0, duration: 0.8, ease: 'expo.out' }, t);
      tl.fromTo(p.rotation, { y: i % 2 ? -1.1 : 1.1, x: 0.3 }, { y: 0, x: 0, duration: 0.9, ease: 'expo.out' }, t);
    });
    const wake = sticker('achtung2', a, 3.5, -5.2, 2.6, 1.6);
    pop(wake, as.lines[0].s + 0.3);
    prev = a;
  }

  // ================= 13) SHARE – Bock drauf?
  const share = shot();
  {
    const s = segs.s22;
    const tB = boundary(s);
    shotOut(prev, tB, 'past');
    shotIn(share, tB, 'slam');
    wallColor(tB, '#F3703A', 0.4);
    const a = say(s, 0, share, { y: 3.4, maxSize: 2.2, maxH: 4.2 });
    const tS = s.lines[1].s;
    tl.to(a.group.position, { y: 5.0, duration: 0.5, ease: 'power3.inOut' }, tS - 0.3);
    tl.to(a.group.scale, { x: a.size * 0.62, y: a.size * 0.62, z: a.size * 0.62, duration: 0.5, ease: 'power3.inOut' }, tS - 0.3);
    say(s, 1, share, { y: 1.2, maxSize: 1.25, maxH: 3 });
    const plane = paperPlane();
    plane.visible = false;
    share.add(plane);
    tl.set(plane, { visible: true }, tS);
    tl.fromTo(plane.position, { x: -7, y: -4.5, z: 1 }, { x: 8, y: 6.5, z: 3, duration: 1.5, ease: 'power1.inOut' }, tS);
    tl.fromTo(plane.rotation, { z: 0.35, x: -0.4, y: 0.2 }, { z: 0.7, x: 0.5, y: -0.3, duration: 1.5, ease: 'sine.inOut' }, tS);
    const sb = sticker('tanzen', share, 3.0, -4.6, 3.3, 1.3);
    pop(sb, s.lines[0].s + 0.2);
  }

  // ================= 14) BROSCHÜRE + ENDCARD
  const fin = shot();
  {
    const s = segs.s23;
    const tB = boundary(s);
    shotOut(share, tB, 'left');
    shotIn(fin, tB, 'right');
    const bk = makeBook();
    bk.group.position.set(0, -0.3, 0);
    fin.add(bk.group);
    tl.fromTo(bk.group.rotation, { y: -1.8, x: -0.4 }, { y: 0.3, x: -0.15, duration: 1.1, ease: 'expo.out' }, tB);
    const [t1, t2, t3] = s.lines;
    const l1 = say(s, 0, fin, { y: 5.3, maxSize: 1.4 });
    textOut(l1, t2.s - 0.34);
    const l2 = say(s, 1, fin, { y: 5.3, maxSize: 1.2, maxH: 2.4 });
    const think = sticker('denkt2', fin, 3.2, -4.8, 3.0, 1.6);
    pop(think, t1.s + 0.1);
    // Buch öffnet sich und blättert
    const tO = t2.s - 0.1;
    tl.to(bk.group.rotation, { y: 0, x: -0.08, duration: 0.7, ease: 'power3.inOut' }, tO - 0.2);
    tl.to(bk.group.position, { x: 2.15, y: 0.1, duration: 0.7, ease: 'power3.inOut' }, tO - 0.2);
    tl.to(bk.group.scale, { x: 0.83, y: 0.83, z: 0.83, duration: 0.7, ease: 'power3.inOut' }, tO - 0.2);
    tl.to(bk.cover.rotation, { y: -Math.PI * 0.985, duration: 0.8, ease: 'power2.inOut' }, tO);
    bk.pages.forEach((p, i) => tl.to(p.rotation, { y: -Math.PI * (0.975 - i * 0.012), duration: 0.6, ease: 'power2.inOut' }, tO + 0.45 + i * 0.16));
    unpop(think, tO);
    const pres = sticker('praesentiert', fin, -3.0, -4.9, 3.1, 1.6);
    pop(pres, tO + 0.15);
    punch(tO, 1.6);
    // Endcard
    const tE = t3.s - 0.35;
    textOut(l2, tE - 0.05);
    tl.to(bk.group.position, { z: 24, duration: 0.5, ease: 'power3.in' }, tE);
    tl.set(bk.group, { visible: false }, tE + 0.52);
    unpop(pres, tE);
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 6.2 * TEX.logo.image.height / TEX.logo.image.width), new THREE.MeshBasicMaterial({ map: TEX.logo, transparent: true, toneMapped: false }));
    logo.castShadow = true;
    logo.position.set(0, 5.0, 0.4);
    logo.visible = false;
    fin.add(logo);
    tl.set(logo, { visible: true }, tE + 0.1);
    tl.fromTo(logo.position, { z: -8, y: 7 }, { z: 0.4, y: 5.0, duration: 0.9, ease: 'expo.out' }, tE + 0.1);
    tl.fromTo(logo.rotation, { x: -1.2 }, { x: 0, duration: 0.9, ease: 'expo.out' }, tE + 0.1);
    const ring = heartRing(2.1, M.gold);
    ring.position.set(0, -2.9, -0.8);
    ring.visible = false;
    fin.add(ring);
    tl.set(ring, { visible: true }, tE + 0.3);
    tl.fromTo(ring.scale, { x: 0.01, y: 0.01, z: 0.01 }, { x: 1, y: 1, z: 1, duration: 0.9, ease: 'elastic.out(1,0.6)' }, tE + 0.3);
    updaters.push((t) => { ring.rotation.y = Math.sin(t * 1.3) * 0.3; });
    say(s, 2, fin, { y: 1.75, maxSize: 1.25, maxH: 2.5 });
    const wave = sticker('winken2', fin, 0, -3.5, 4.2, 1.2);
    pop(wave, tE + 0.6, 0.9);
    confetti(t3.s + 0.6, 0, 1.5, 90, 5);
    punch(t3.s + 0.6, 1.8);
  }
  tl.set({}, {}, T.total);
}

// ------------------------------------------------------------------ 3D-Broschüre (Cover klappt auf, Seiten blättern)
function makeBook() {
  const S = 5.2;
  const g = new THREE.Group();
  const block = new THREE.Mesh(new THREE.BoxGeometry(S * 0.97, S * 0.97, 0.42), M.paper);
  block.position.set(0.03, 0, -0.26);
  block.castShadow = true;
  const back = new THREE.Mesh(new RoundedBoxGeometry(S, S, 0.06, 2, 0.02), M.orange);
  back.position.z = -0.5;
  back.castShadow = true;
  g.add(block, back);
  const FAN = ['06', '17', '21', '28', '31', '39', '11'];
  const pageMat = (n) => new THREE.MeshBasicMaterial({ map: TEX[`pages/fan-${n}.webp`], toneMapped: false });
  const ps = S * 0.96;
  const pages = FAN.slice(0, 5).map((n, i) => {
    const piv = new THREE.Group();
    piv.position.set(-S / 2, 0, -0.03 - i * 0.008);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(ps, ps), pageMat(n));
    front.position.x = ps / 2 + 0.04;
    const backM = new THREE.Mesh(new THREE.PlaneGeometry(ps, ps), pageMat(FAN[(i + 5) % FAN.length]));
    backM.position.x = ps / 2 + 0.04;
    backM.rotation.y = Math.PI;
    front.castShadow = true;
    piv.add(front, backM);
    g.add(piv);
    return piv;
  });
  const cover = new THREE.Group();
  cover.position.set(-S / 2, 0, 0.02);
  const coverMat = new THREE.MeshBasicMaterial({ map: TEX['pages/cover.webp'], toneMapped: false });
  const cm = new THREE.Mesh(new THREE.BoxGeometry(S, S, 0.05), [M.orange, M.orange, M.orange, M.orange, coverMat, M.orange]);
  cm.position.x = S / 2;
  cm.castShadow = true;
  cover.add(cm);
  g.add(cover);
  return { group: g, cover, pages };
}

function paperPlane() {
  const v = [1.3, 0, 0, -0.9, 0.85, 0.08, -0.7, 0, 0,
    1.3, 0, 0, -0.7, 0, 0, -0.9, -0.85, 0.08,
    1.3, 0, 0, -0.7, 0, 0, -0.8, 0, -0.38];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5, side: THREE.DoubleSide }));
  m.castShadow = true;
  const g = new THREE.Group();
  g.scale.setScalar(1.15);
  g.add(m);
  return g;
}

// ------------------------------------------------------------------ Kacheln Fresh Digital (Canvas → 3D-Tafel)
function tileBase(ctx, w, h) { ctx.fillStyle = '#16191b'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#F3703A'; ctx.fillRect(0, 0, 26, h); }
function drawTile100(ctx, w, h) {
  tileBase(ctx, w, h);
  ctx.save(); rrect(ctx, 70, 40, h * 1.3, h - 80, 26); ctx.clip(); coverImg(ctx, TEX['img/100-handgriffe.webp'].image, 70, 40, h * 1.3, h - 80); ctx.restore();
  const x = 70 + h * 1.3 + 50;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#FCE531'; ctx.font = '900 150px Outfit'; ctx.fillText('100', x, 175);
  ctx.fillStyle = '#ffffff'; ctx.font = '900 76px Outfit'; ctx.fillText('HANDGRIFFE', x, 262);
  ctx.fillStyle = '#c5cacf'; ctx.font = '600 44px Outfit'; ctx.fillText('als Videos – direkt aus der Praxis', x, 330);
}
function drawTileBlended(ctx, w, h) {
  tileBase(ctx, w, h);
  ctx.save(); rrect(ctx, 90, 70, h - 140, h - 140, 40); ctx.clip(); ctx.drawImage(TEX['img/edeka-nx.webp'].image, 90, 70, h - 140, h - 140); ctx.restore();
  const x = h + 30;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff'; ctx.font = '900 96px Outfit'; ctx.fillText('BLENDED', x, 165);
  ctx.fillStyle = '#FCE531'; ctx.fillText('LEARNING', x, 265);
  ctx.fillStyle = '#c5cacf'; ctx.font = '600 44px Outfit'; ctx.fillText('Wissen, das zu dir passt', x, 335);
}
function drawTileWizz(ctx, w, h) {
  tileBase(ctx, w, h);
  ctx.save(); ctx.translate(250, h / 2); ctx.rotate(-0.07);
  rrect(ctx, -170, -125, 340, 250, 30); ctx.fillStyle = '#111'; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = '#FCE531'; ctx.stroke();
  ctx.fillStyle = '#FCE531'; ctx.font = 'italic 900 104px Outfit'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('Wizz', 0, -38); ctx.fillText('Up!', 0, 62); ctx.restore();
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff'; ctx.font = '900 96px Outfit'; ctx.fillText('QUIZ-DUELL', 500, 185);
  ctx.fillStyle = '#c5cacf'; ctx.font = '600 44px Outfit'; ctx.fillText('Lernen. Spielen. Wissen pushen!', 500, 265);
}

// ------------------------------------------------------------------ Film-Korn
{
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'); const d = g.createImageData(256, 256); const r = makeRng(7);
  for (let i = 0; i < d.data.length; i += 4) { const v = r() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  g.putImageData(d, 0, 0);
  document.getElementById('grain').style.backgroundImage = `url(${c.toDataURL()})`;
}

// ------------------------------------------------------------------ Start
function seek(t) {
  t = Math.min(t, T.total);
  tl.time(t, false);
  updaters.forEach((f) => f(t));
  const f = Math.round(t * T.fps);
  document.getElementById('grain').style.backgroundPosition = `${(f * 73) % 256}px ${(f * 151) % 256}px`;
  renderer.render(scene, cam);
}

async function init() {
  await document.fonts.load('900 40px Outfit');
  await document.fonts.load('600 40px Outfit');
  const ttf = new TTFLoader();
  F.o = new Font(ttf.parse(await (await fetch(A + 'fonts3d/outfit-latin-900-normal.woff')).arrayBuffer()));
  F.m = new Font(ttf.parse(await (await fetch(A + 'fonts3d/permanent-marker-latin-400-normal.woff')).arrayBuffer()));
  const sbNames = ['winken', 'party', 'zeigt', 'denkt', 'tanzen', 'idee', 'schulterzucken', 'fingerpistole', 'grill', 'grill2', 'koch-loeffel', 'koch',
    'verliebt', 'klatschen', 'schock', 'achtung', 'stark', 'daumen', 'verlegen', 'winken2', 'party2', 'schlafen2', 'achtung2', 'denkt2', 'praesentiert'];
  const paths = [
    ...sbNames.map((n) => `sb/${n}.webp`),
    ...['01', '03', '04', '05', '06', '07', '10', '11', '12', '13', '14', '15', '18', '19', '21', '22', '24', '25', '26'].map((n) => `titles/${n}.webp`),
    ...['32', '33', '34', '35'].map((n) => `pages/${n}.webp`),
    ...['06', '17', '21', '28', '31', '39', '11'].map((n) => `pages/fan-${n}.webp`),
    'pages/cover.webp', 'img/petersilie.webp', 'img/fresh-digital.webp', 'img/100-handgriffe.webp', 'img/edeka-nx.webp',
    'food/p05_308.webp', 'food/p05_364.webp', 'food/p17_1098.webp', 'food/p20_1257.webp', 'food/p03_145.webp', 'food/p24_1408.webp',
    'food/p21_1277.webp', 'food/p26_1450.webp', 'food/p38_1906.webp', 'food/p29_1556.webp',
  ];
  await Promise.all(paths.map(loadTex));
  TEX.logo = await svgTex('img/food-academy-fresh-logo.svg', 2048);
  build();
  seek(0);
}

window.__seek = seek;
window.__total = T.total;
window.__fps = T.fps;
init().then(() => window.__resolveReady(true)).catch((e) => { console.error('INIT', e.message, e.stack); window.__resolveReady(false); });

// Vorschau im Browser (mit Ton): src/index.html ohne ?render
const params = new URLSearchParams(location.search);
if (!params.has('render')) {
  document.body.classList.add('preview');
  const vp = document.getElementById('viewport');
  const stage = document.getElementById('stage');
  const fit = () => { const k = Math.min((innerHeight - 70) / 1920, (innerWidth - 20) / 1080); vp.style.width = 1080 * k + 'px'; vp.style.height = 1920 * k + 'px'; Object.assign(stage.style, { transform: `scale(${k})`, transformOrigin: 'top left' }); };
  fit(); addEventListener('resize', fit);
  const ctr = document.getElementById('controls'); ctr.hidden = false;
  const audio = document.getElementById('voice'); const btn = document.getElementById('play'); const scrub = document.getElementById('scrub'); const time = document.getElementById('time');
  const loop = () => { seek(audio.currentTime); scrub.value = (audio.currentTime / T.total) * 1000; time.textContent = audio.currentTime.toFixed(1) + ' s'; if (!audio.paused) requestAnimationFrame(loop); };
  btn.onclick = () => { if (audio.paused) { audio.play(); btn.textContent = '❚❚ Pause'; loop(); } else { audio.pause(); btn.textContent = '▶ Abspielen'; } };
  scrub.oninput = () => { audio.currentTime = (scrub.value / 1000) * T.total; loop(); };
}
