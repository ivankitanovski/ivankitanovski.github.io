// Room 101: a low-poly, PS1-style office you can walk around.
// Every object opens a window with a section of the classic site.
import * as THREE from 'three';

const $ = (s) => document.querySelector(s);
const tpl = (id, sel) => document.getElementById('t-' + id).content.querySelectorAll(sel);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Renderer ----------
const canvas = $('#view');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'low-power' });
} catch (e) {
  document.body.insertAdjacentHTML('beforeend',
    '<div class="fail"><p>Your browser could not start WebGL, so the room cannot load.<br><a href="index.html">Visit the classic site</a>.</p></div>');
  throw e;
}
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const BG = 0x140c1c;
const scene = new THREE.Scene();
scene.background = new THREE.Color(BG);
scene.fog = new THREE.Fog(BG, 7, 15);

const camera = new THREE.PerspectiveCamera(68, 1, 0.05, 40);
camera.rotation.order = 'YXZ';

// Vertex snapping uniform (the PS1 wobble).
const snap = { value: new THREE.Vector2(160, 120) };

function resize() {
  const w = innerWidth, h = innerHeight;
  const px = Math.max(2, Math.round(Math.max(w, h) / 480)); // chunky, integer pixel size
  const iw = Math.ceil(w / px), ih = Math.ceil(h / px);
  renderer.setSize(iw, ih, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  snap.value.set(iw / 4, ih / 4);
}
addEventListener('resize', resize);
resize();

// ---------- Materials & textures ----------
function ps1(mat) {
  mat.dithering = true;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uSnap = snap;
    sh.vertexShader = 'uniform vec2 uSnap;\n' + sh.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
       { vec4 p = gl_Position; if (p.w > 0.0) { p.xy = floor(p.xy / p.w * uSnap + 0.5) / uSnap * p.w; gl_Position = p; } }`);
  };
  return mat;
}
const lam = (o) => ps1(new THREE.MeshLambertMaterial(o));
const unlit = (o) => ps1(new THREE.MeshBasicMaterial(o));

let seed = 101;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

function tex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.userData.g = g;
  return t;
}
function speckle(g, w, h, n, colors) {
  for (let i = 0; i < n; i++) { g.fillStyle = colors[(rnd() * colors.length) | 0]; g.fillRect((rnd() * w) | 0, (rnd() * h) | 0, 1, 1); }
}

const LC = { water: '#4f86a8', forest: '#3d7d55', crop: '#b8a44e', urban: '#b06a52', bare: '#8c826c', grass: '#7a9a5a' };

const T = {
  floor: tex(32, 32, (g) => {
    const cols = ['#6b4128', '#5e3822', '#774b2d', '#634026'];
    for (let r = 0; r < 4; r++) {
      g.fillStyle = cols[r]; g.fillRect(0, r * 8, 32, 8);
      for (let i = 0; i < 40; i++) {
        g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,.14)' : 'rgba(255,220,180,.08)';
        g.fillRect((rnd() * 32) | 0, r * 8 + ((rnd() * 7) | 0), 1 + ((rnd() * 5) | 0), 1);
      }
      g.fillStyle = '#2b180e'; g.fillRect(0, r * 8 + 7, 32, 1); g.fillRect((r * 13 + 5) % 32, r * 8, 1, 7);
    }
  }, [10, 8]),
  wall: tex(16, 32, (g) => {
    g.fillStyle = '#34503f'; g.fillRect(0, 0, 16, 32);
    g.fillStyle = '#3d5d4a'; g.fillRect(4, 0, 8, 32);
    g.fillStyle = '#2c4536'; g.fillRect(4, 0, 1, 32); g.fillRect(11, 0, 1, 32);
    g.fillStyle = '#b89a4e'; [[8, 6], [8, 22], [0, 14], [15, 14]].forEach(([x, y]) => { g.fillRect(x, y - 1, 1, 3); g.fillRect(x - 1, y, 3, 1); });
    speckle(g, 16, 32, 30, ['rgba(0,0,0,.12)', 'rgba(255,255,255,.05)']);
  }, [20, 3]),
  panel: tex(32, 32, (g) => {
    g.fillStyle = '#4a2c1a'; g.fillRect(0, 0, 32, 32);
    g.fillStyle = '#5a3720'; g.fillRect(3, 4, 26, 24);
    g.fillStyle = '#2e1a0e'; g.fillRect(3, 27, 26, 1); g.fillRect(28, 4, 1, 24);
    g.fillStyle = '#6e4529'; g.fillRect(3, 4, 26, 1); g.fillRect(3, 4, 1, 24);
    speckle(g, 32, 32, 40, ['rgba(0,0,0,.15)', 'rgba(255,200,150,.06)']);
  }, [10, 1]),
  ceiling: tex(16, 16, (g) => {
    g.fillStyle = '#cfc6b4'; g.fillRect(0, 0, 16, 16);
    speckle(g, 16, 16, 30, ['#b9b09e', '#a99f8c']);
    g.fillStyle = '#8f8676'; g.fillRect(0, 15, 16, 1); g.fillRect(15, 0, 1, 16);
  }, [10, 8]),
  rug: tex(64, 40, (g) => {
    g.fillStyle = '#7a1f2b'; g.fillRect(0, 0, 64, 40);
    g.fillStyle = '#d9b45a'; g.fillRect(2, 2, 60, 36);
    g.fillStyle = '#7a1f2b'; g.fillRect(4, 4, 56, 32);
    g.fillStyle = '#23345e'; g.fillRect(8, 8, 48, 24);
    g.fillStyle = '#d9b45a';
    for (let x = 0; x < 6; x++) for (let y = 0; y < 3; y++) {
      const cx = 12 + x * 8, cy = 12 + y * 8; g.fillRect(cx - 1, cy - 3, 2, 6); g.fillRect(cx - 3, cy - 1, 6, 2);
    }
    speckle(g, 64, 40, 160, ['rgba(0,0,0,.18)', 'rgba(255,255,255,.06)']);
  }),
  cork: tex(32, 32, (g) => {
    g.fillStyle = '#b07a46'; g.fillRect(0, 0, 32, 32);
    speckle(g, 32, 32, 260, ['#8c5c32', '#c48d55', '#9c6a3c', '#d39d63']);
  }, [3, 2]),
  wood: tex(16, 16, (g) => {
    g.fillStyle = '#5b3520'; g.fillRect(0, 0, 16, 16);
    for (let y = 0; y < 16; y += 3) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, y, 16, 1); }
    speckle(g, 16, 16, 20, ['rgba(255,210,160,.08)']);
  }),
  metal: tex(16, 16, (g) => {
    g.fillStyle = '#7d8790'; g.fillRect(0, 0, 16, 16);
    speckle(g, 16, 16, 40, ['#6f7882', '#8b959e']);
  }),
  spine: tex(8, 32, (g) => {
    g.fillStyle = '#e0e0e0'; g.fillRect(0, 0, 8, 32);
    g.fillStyle = '#ffffff'; g.fillRect(0, 4, 8, 1); g.fillRect(0, 27, 8, 1);
    g.fillStyle = '#9a9a9a'; g.fillRect(2, 10, 4, 10);
    g.fillStyle = '#bdbdbd'; g.fillRect(0, 0, 1, 32);
  }),
};

// Low-res, posterized portrait.
const portraitTex = tex(36, 45, (g) => { g.fillStyle = '#222'; g.fillRect(0, 0, 36, 45); });
{
  const img = new Image();
  img.onload = () => {
    const g = portraitTex.userData.g;
    g.imageSmoothingEnabled = true;
    const sw = img.width * 0.8, sh = img.height;
    g.drawImage(img, (img.width - sw) / 2, 0, sw, sh, 0, 0, 36, 45);
    const d = g.getImageData(0, 0, 36, 45);
    for (let i = 0; i < d.data.length; i += 4) for (let k = 0; k < 3; k++) d.data[i + k] = Math.round(d.data[i + k] / 42) * 42;
    g.putImageData(d, 0, 0);
    portraitTex.needsUpdate = true;
  };
  img.src = 'img/ivan.jpg';
}

// ---------- Scene helpers ----------
function mesh(geo, mat, x = 0, y = 0, z = 0, parent = scene) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
const box = (w, h, d, mat, x, y, z, parent) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);
const cyl = (rt, rb, h, seg, mat, x, y, z, parent) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z, parent);
const plane = (w, h, mat, x, y, z, parent) => mesh(new THREE.PlaneGeometry(w, h), mat, x, y, z, parent);
function group(x = 0, y = 0, z = 0, ry = 0, parent = scene) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g); return g;
}

// Interactive objects: each tagged root has a key (+ optional item index).
const tagged = [];
function tag(root, key, extra = {}) {
  root.userData.root = true;
  root.userData.key = key;
  Object.assign(root.userData, extra);
  root.traverse((o) => {
    if (o.isMesh) {
      const m = o.material.clone();
      ps1(m);
      o.material = m;
      o.userData.owner = root;
    }
  });
  tagged.push(root);
  return root;
}
function setGlow(root, on) {
  if (!root) return;
  root.traverse((o) => {
    if (o.isMesh && o.material.emissive) o.material.emissive.setHex(on ? 0x3a2a08 : 0x000000);
  });
}

// ---------- Room shell ----------
const W = 10, D = 8, H = 3;
const M = {
  wall: lam({ map: T.wall }),
  panel: lam({ map: T.panel }),
  trim: lam({ color: 0x3a2112 }),
  wood: lam({ map: T.wood }),
  darkwood: lam({ map: T.wood, color: 0x8a7a70 }),
  beige: lam({ color: 0xcfc4a8 }),
  black: lam({ color: 0x1a1a1f }),
  metal: lam({ map: T.metal }),
  brass: lam({ color: 0xc9a24a }),
  paper: lam({ color: 0xefe6cf }),
};

const floor = mesh(new THREE.PlaneGeometry(W, D), lam({ map: T.floor }));
floor.rotation.x = -Math.PI / 2;
floor.userData.floor = true;
const ceil = mesh(new THREE.PlaneGeometry(W, D), lam({ map: T.ceiling }), 0, H, 0);
ceil.rotation.x = Math.PI / 2;

// Walls as local frames: local +z points into the room.
function wall(len, x, z, ry) {
  const g = group(x, 0, z, ry);
  const wp = T.wall.clone(); wp.repeat.set(len * 2, H); wp.needsUpdate = true;
  plane(len, H, lam({ map: wp }), 0, H / 2, 0, g);
  const pt = T.panel.clone(); pt.repeat.set(len, 1); pt.needsUpdate = true;
  plane(len, 0.95, lam({ map: pt }), 0, 0.475, 0.01, g);
  box(len, 0.06, 0.05, M.trim, 0, 0.97, 0.025, g);
  box(len, 0.12, 0.03, M.trim, 0, 0.06, 0.03, g);
  box(len, 0.08, 0.04, M.trim, 0, H - 0.04, 0.02, g);
  return g;
}
const north = wall(W, 0, -D / 2, 0);            // local x = world x
const south = wall(W, 0, D / 2, Math.PI);       // local x = world -x
const west = wall(D, -W / 2, 0, Math.PI / 2);   // local x = world -z
const east = wall(D, W / 2, 0, -Math.PI / 2);   // local x = world z

// Rug
const rug = mesh(new THREE.PlaneGeometry(3.4, 2.3), lam({ map: T.rug }), 0, 0.006, 0.4);
rug.rotation.x = -Math.PI / 2;
rug.userData.floor = true;

// ---------- Lights ----------
scene.add(new THREE.HemisphereLight(0xa89cd0, 0x3a2a20, 1.25));
const ceilingLight = new THREE.PointLight(0xffd9a0, 9, 14, 1.2);
ceilingLight.position.set(0, 2.7, 0.2);
scene.add(ceilingLight);
cyl(0.38, 0.42, 0.07, 10, unlit({ color: 0xfff1cc }), 0, H - 0.035, 0.2);
cyl(0.015, 0.015, 0.2, 4, M.black, 0, H - 0.1, 0.2);

// ---------- Window (north) ----------
{
  const sky = tex(72, 40, (g) => {
    const bands = ['#2b1e5a', '#3f2a73', '#5b3683', '#86468a', '#b9577e', '#e47a6b', '#f6a55f'];
    bands.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * 4, 72, 4); });
    for (let y = 0; y < 28; y++) for (let x = 0; x < 72; x++) if ((x + y) % 2 === 0 && y % 4 === 3) { g.fillStyle = bands[Math.min(6, (y >> 2) + 1)]; g.fillRect(x, y, 1, 1); }
    g.fillStyle = '#fff2c4'; g.fillRect(50, 22, 6, 4); g.fillRect(51, 21, 4, 6);
    // Vodno and the city
    g.fillStyle = '#2a2140';
    for (let x = 0; x < 72; x++) { const h = 10 + Math.round(6 * Math.sin(x / 11) + 3 * Math.sin(x / 4.3)); g.fillRect(x, 40 - h, 1, h); }
    g.fillStyle = '#ffffff'; g.fillRect(24, 22, 1, 5); g.fillRect(22, 23, 5, 1); // Millennium Cross
    g.fillStyle = '#181230';
    for (let x = 0; x < 72; x += 3) { const h = 3 + ((x * 7) % 6); g.fillRect(x, 40 - h, 3, h); }
    g.fillStyle = '#ffd36b';
    for (let i = 0; i < 26; i++) g.fillRect((rnd() * 72) | 0, 34 + ((rnd() * 5) | 0), 1, 1);
    g.fillStyle = '#f7e9ff';
    for (let i = 0; i < 14; i++) g.fillRect((rnd() * 72) | 0, (rnd() * 8) | 0, 1, 1);
  });
  const win = group(0, 1.95, 0.01, 0, north);
  plane(1.6, 0.9, unlit({ map: sky, fog: false }), 0, 0, 0, win);
  const f = M.trim;
  box(1.72, 0.06, 0.06, f, 0, 0.48, 0.02, win); box(1.72, 0.06, 0.06, f, 0, -0.48, 0.02, win);
  box(0.06, 0.96, 0.06, f, -0.83, 0, 0.02, win); box(0.06, 0.96, 0.06, f, 0.83, 0, 0.02, win);
  box(0.03, 0.9, 0.03, f, 0, 0, 0.02, win); box(1.6, 0.03, 0.03, f, 0, 0.05, 0.02, win);
  box(1.8, 0.04, 0.16, f, 0, -0.52, 0.07, win);
  const glow = new THREE.PointLight(0xf09a7a, 1.5, 4, 1.5);
  glow.position.set(0, 1.9, -3.5); scene.add(glow);
}

// ---------- Desk (north) ----------
{
  box(2.0, 0.06, 0.8, M.wood, 0, 0.75, -3.5);
  [[-0.95, -3.85], [-0.95, -3.15]].forEach(([x, z]) => box(0.06, 0.72, 0.06, M.darkwood, x, 0.36, z));
  box(0.5, 0.72, 0.76, M.darkwood, 0.72, 0.36, -3.5);
  [0.55, 0.3].forEach((y) => { box(0.42, 0.18, 0.02, M.wood, 0.72, y, -3.11); box(0.12, 0.02, 0.03, M.brass, 0.72, y + 0.03, -3.09); });
  box(1.9, 0.5, 0.02, M.darkwood, 0, 0.45, -3.86);
}

// CRT terminal (About)
const screenCanvasTex = tex(160, 120, () => {});
const crt = group(0, 0.78, -3.58);
{
  box(0.34, 0.03, 0.3, M.beige, 0, 0.015, 0, crt);
  box(0.58, 0.48, 0.48, M.beige, 0, 0.27, 0, crt);
  box(0.42, 0.36, 0.24, M.beige, 0, 0.27, -0.33, crt);
  box(0.5, 0.39, 0.02, M.black, 0, 0.28, 0.245, crt);
  plane(0.46, 0.345, unlit({ map: screenCanvasTex }), 0, 0.28, 0.257, crt);
  box(0.04, 0.02, 0.01, lam({ color: 0x55ff77, emissive: 0x22aa44 }), 0.22, 0.06, 0.245, crt);
  tag(crt, 'about');
  const g = new THREE.PointLight(0x66ff99, 1.2, 2.2, 2);
  g.position.set(0, 1.05, -3.1); scene.add(g);
}
const kb = tex(32, 10, (g) => {
  g.fillStyle = '#b8ad92'; g.fillRect(0, 0, 32, 10);
  g.fillStyle = '#e4dcc6';
  for (let r = 0; r < 4; r++) for (let c = 0; c < 15; c++) g.fillRect(1 + c * 2 + (r % 2), 1 + r * 2, 1, 1);
  g.fillRect(8, 9, 14, 1);
});
box(0.5, 0.03, 0.17, lam({ color: 0xcfc4a8 }), 0, 0.795, -3.12).material = lam({ map: kb });
cyl(0.045, 0.04, 0.1, 8, lam({ color: 0xe8e0d0 }), 0.36, 0.83, -3.2); // mug

// Telephone (Contact)
const phone = group(0.72, 0.78, -3.32, -0.25);
{
  const red = lam({ color: 0xb8322a });
  box(0.24, 0.08, 0.2, red, 0, 0.04, 0, phone);
  box(0.16, 0.012, 0.12, lam({ color: 0xe8dcc0 }), 0, 0.085, 0.02, phone);
  box(0.28, 0.04, 0.06, red, 0, 0.12, -0.03, phone);
  box(0.07, 0.05, 0.09, red, -0.12, 0.1, -0.03, phone);
  box(0.07, 0.05, 0.09, red, 0.12, 0.1, -0.03, phone);
  tag(phone, 'contact');
}

// Floppy disks (CV)
const floppyTex = tex(16, 16, (g) => {
  g.fillStyle = '#26408f'; g.fillRect(0, 0, 16, 16);
  g.fillStyle = '#b9c0c8'; g.fillRect(4, 0, 8, 5); g.fillStyle = '#26408f'; g.fillRect(9, 1, 2, 3);
  g.fillStyle = '#f2ecdc'; g.fillRect(2, 7, 12, 8);
  g.fillStyle = '#c0392b'; g.fillRect(2, 7, 12, 1);
  g.fillStyle = '#222'; g.fillRect(4, 9, 1, 3); g.fillRect(5, 9, 2, 1); g.fillRect(5, 11, 2, 1); // C
  g.fillRect(8, 9, 1, 2); g.fillRect(9, 11, 1, 1); g.fillRect(10, 9, 1, 2); // V
});
const floppies = group(-0.6, 0.78, -3.22, 0.2);
{
  box(0.15, 0.01, 0.15, lam({ color: 0x1b1b1b }), 0.02, 0.005, -0.01, floppies).rotation.y = 0.3;
  const top = box(0.15, 0.01, 0.15, lam({ color: 0x26408f }), 0, 0.015, 0, floppies);
  plane(0.15, 0.15, lam({ map: floppyTex }), 0, 0.0205, 0, floppies).rotation.x = -Math.PI / 2;
  tag(floppies, 'cv');
}

// Desk lamp
{
  const lamp = group(-0.85, 0.78, -3.65);
  cyl(0.08, 0.09, 0.03, 8, M.black, 0, 0.015, 0, lamp);
  const arm = cyl(0.012, 0.012, 0.45, 4, M.black, 0, 0.24, 0, lamp); arm.rotation.x = 0.25;
  const shade = cyl(0.04, 0.11, 0.12, 8, lam({ color: 0x2f6b45 }), 0, 0.45, 0.1, lamp); shade.rotation.x = 0.5;
  cyl(0.03, 0.03, 0.02, 6, unlit({ color: 0xffe9b0 }), 0, 0.4, 0.13, lamp);
  const l = new THREE.PointLight(0xffc070, 2.5, 3, 1.6);
  l.position.set(-0.8, 1.05, -3.45); scene.add(l);
}

// Chair
{
  const red = lam({ color: 0x6a2330 });
  const ch = group(0, 0, -2.75);
  box(0.48, 0.07, 0.45, red, 0, 0.48, 0, ch);
  box(0.48, 0.5, 0.06, red, 0, 0.8, 0.22, ch);
  [[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.18], [0.2, 0.18]].forEach(([x, z]) => box(0.04, 0.45, 0.04, M.black, x, 0.225, z, ch));
}

// Portrait (About)
const portrait = group(-2.5, 1.7, 0.01, 0, north);
{
  box(0.74, 0.9, 0.05, lam({ color: 0x8a6a2a }), 0, 0, 0.025, portrait);
  plane(0.6, 0.75, lam({ map: portraitTex }), 0, 0, 0.052, portrait);
  const plate = tex(32, 6, (g) => { g.fillStyle = '#c9a24a'; g.fillRect(0, 0, 32, 6); g.fillStyle = '#5a4210'; for (let i = 0; i < 9; i++) g.fillRect(4 + i * 3, 2, 2, 2); });
  plane(0.28, 0.05, lam({ map: plate }), 0, -0.52, 0.03, portrait);
  tag(portrait, 'about');
}

// Diplomas (Education)
const diplomas = group(2.85, 1.72, 0.01, 0, north);
{
  const parchment = tex(32, 24, (g) => {
    g.fillStyle = '#efe3c2'; g.fillRect(0, 0, 32, 24);
    g.fillStyle = '#7a5c2e'; g.fillRect(8, 3, 16, 2);
    g.fillStyle = '#a89878'; for (let y = 8; y < 18; y += 2) g.fillRect(5, y, 22 - (y % 4) * 2, 1);
    g.fillStyle = '#b3262b'; g.fillRect(23, 17, 5, 5); g.fillStyle = '#d9474b'; g.fillRect(24, 18, 3, 3);
  });
  [['PhD', -0.85], ['MSc', 0], ['BSc', 0.85]].forEach(([, x]) => {
    box(0.66, 0.5, 0.04, M.black, x, 0, 0.02, diplomas);
    plane(0.56, 0.4, lam({ map: parchment }), x, 0, 0.042, diplomas);
  });
  tag(diplomas, 'education');
}

// ---------- Bookshelf (west) — publications ----------
const PUB_COLORS = [...tpl('pubs', '[data-c]')].map((li) => LC[li.dataset.c]);
const PUB_TITLES = [...tpl('pubs', '.t')].map((a) => a.textContent.trim());
const shelf = group(0.5, 0, 0.01, 0, west);
{
  const sw = 2.4, sh = 2.25, sd = 0.4, wd = M.darkwood;
  box(0.05, sh, sd, wd, -sw / 2, sh / 2, sd / 2, shelf);
  box(0.05, sh, sd, wd, sw / 2, sh / 2, sd / 2, shelf);
  box(sw, 0.05, sd, wd, 0, sh, sd / 2, shelf);
  box(sw, 0.02, 0.02, M.black, 0, sh / 2, 0.01, shelf).scale.y = sh / 0.02;
  const levels = [0.08, 0.6, 1.12, 1.64];
  levels.forEach((y) => box(sw, 0.04, sd, wd, 0, y, sd / 2, shelf));
  const muted = ['#5b4a6e', '#4e3b2c', '#6d5a3c', '#3f4f5c', '#704141', '#5e6b4a', '#7b6a54'];
  const spineMat = (hex) => lam({ map: T.spine, color: new THREE.Color(hex) });
  levels.forEach((y, li) => {
    let x = -sw / 2 + 0.06;
    const pubShelf = li === 2 || li === 1; // eye-level shelves hold the publications
    let pubIdx = li === 2 ? 0 : 6;
    const pubEnd = li === 2 ? 6 : PUB_TITLES.length;
    while (x < sw / 2 - 0.12) {
      if (pubShelf && pubIdx < pubEnd) {
        const w = 0.09, h = 0.4 - (pubIdx % 3) * 0.03, d = 0.3;
        const b = box(w, h, d, spineMat(PUB_COLORS[pubIdx] || '#888'), x + w / 2, y + 0.02 + h / 2, 0.06 + d / 2, shelf);
        tag(b, 'pubs', { idx: pubIdx, tip: PUB_TITLES[pubIdx] });
        x += w + 0.008; pubIdx++;
        if (pubIdx === pubEnd) x += 0.12;
        continue;
      }
      if (li === 3 && x > 0.3 && x < 0.5) { // a small globe-less trophy gap
        x += 0.25; continue;
      }
      const w = 0.04 + rnd() * 0.05, h = 0.26 + rnd() * 0.14, d = 0.22 + rnd() * 0.08;
      const b = box(w, h, d, spineMat(muted[(rnd() * muted.length) | 0]), x + w / 2, y + 0.02 + h / 2, 0.04 + d / 2, shelf);
      if (rnd() < 0.08) { b.rotation.z = 0.25; b.position.x += 0.04; x += 0.06; }
      x += w + 0.006;
    }
  });
  // Trophy on top shelf
  const tro = group(0.42, 1.66, 0.2, 0, shelf);
  cyl(0.06, 0.07, 0.05, 6, M.black, 0, 0.025, 0, tro);
  cyl(0.015, 0.015, 0.08, 4, M.brass, 0, 0.09, 0, tro);
  cyl(0.07, 0.03, 0.1, 8, M.brass, 0, 0.18, 0, tro);
  const label = tex(64, 8, (g) => {
    g.fillStyle = '#c9a24a'; g.fillRect(0, 0, 64, 8);
    g.fillStyle = '#2a1c06'; g.font = 'bold 7px monospace'; g.textBaseline = 'top'; g.fillText('PUBLICATIONS', 6, 0);
  });
  plane(0.6, 0.075, lam({ map: label }), 0, sh - 0.07, sd + 0.002, shelf);
}

// Plant
{
  const p = group(-4.4, 0, -3.4);
  cyl(0.2, 0.15, 0.38, 8, lam({ color: 0xa4532f }), 0, 0.19, 0, p);
  cyl(0.18, 0.18, 0.02, 8, lam({ color: 0x3b2618 }), 0, 0.37, 0, p);
  const leaf = lam({ color: 0x3d7d55, flatShading: true });
  const leaf2 = lam({ color: 0x2f6b45, flatShading: true });
  for (let i = 0; i < 7; i++) {
    const c = mesh(new THREE.ConeGeometry(0.09, 0.7, 4), i % 2 ? leaf : leaf2, 0, 0.7, 0, p);
    c.rotation.z = 0.35 + rnd() * 0.3; c.rotation.y = (i / 7) * Math.PI * 2;
    c.position.x = Math.sin(c.rotation.y) * 0.08; c.position.z = Math.cos(c.rotation.y) * 0.08;
    c.rotation.order = 'YXZ';
  }
}

// ---------- Corkboard (east) — projects ----------
const PROJ_TITLES = [...tpl('projects', '.t')].map((d) => d.textContent.trim());
const PROJ_COLORS = [LC.forest, LC.crop, LC.water, LC.urban, LC.grass, LC.bare];
const cork = group(-0.5, 1.65, 0.01, 0, east);
{
  box(2.5, 1.4, 0.05, M.trim, 0, 0, 0.025, cork);
  plane(2.36, 1.26, lam({ map: T.cork }), 0, 0, 0.052, cork);
  PROJ_TITLES.forEach((t, i) => {
    const col = i % 3, row = (i / 3) | 0;
    const card = group(-0.76 + col * 0.76, 0.3 - row * 0.6, 0.06, 0, cork);
    card.rotation.z = (rnd() - 0.5) * 0.12;
    const ct = tex(32, 24, (g) => {
      g.fillStyle = '#f4efe0'; g.fillRect(0, 0, 32, 24);
      g.fillStyle = PROJ_COLORS[i]; g.fillRect(0, 0, 32, 6);
      g.fillStyle = '#8b8577';
      for (let y = 9; y < 22; y += 3) g.fillRect(3, y, 18 + ((y * 7 + i * 5) % 9), 1);
      g.fillStyle = PROJ_COLORS[i]; g.fillRect(24, 15, 5, 6);
    });
    plane(0.6, 0.45, lam({ map: ct, side: THREE.DoubleSide }), 0, 0, 0, card);
    mesh(new THREE.SphereGeometry(0.025, 6, 4), lam({ color: [0xd8423a, 0x3a7bd8, 0xe8c23a][i % 3] }), 0, 0.18, 0.02, card);
    tag(card, 'projects', { idx: i, tip: t });
  });
  const label = tex(48, 8, (g) => {
    g.fillStyle = '#f4efe0'; g.fillRect(0, 0, 48, 8);
    g.fillStyle = '#1a1a1a'; g.font = 'bold 7px monospace'; g.textBaseline = 'top'; g.fillText('PROJECTS', 7, 0);
  });
  plane(0.5, 0.085, lam({ map: label }), 0, 0.76, 0.03, cork);
}

// ---------- Filing cabinet (east) — experience ----------
const cabinet = group(4.68, 0, 2.4, -Math.PI / 2); // front faces -x
{
  box(0.58, 1.32, 0.6, M.metal, 0, 0.66, 0, cabinet);
  const years = ['2022–NOW', '2013–2021', '2008–2012'];
  years.forEach((yr, i) => {
    const y = 1.1 - i * 0.42;
    box(0.52, 0.38, 0.02, lam({ color: 0x8e99a3 }), 0, y, 0.31, cabinet);
    box(0.2, 0.03, 0.03, M.black, 0, y - 0.06, 0.33, cabinet);
    const lt = tex(32, 10, (g) => {
      g.fillStyle = '#efe6cf'; g.fillRect(0, 0, 32, 10);
      g.fillStyle = '#222'; g.font = '7px monospace'; g.textBaseline = 'top'; g.fillText(yr, 1, 2);
    });
    plane(0.16, 0.05, lam({ map: lt }), 0, y + 0.07, 0.322, cabinet);
  });
  tag(cabinet, 'experience');
  // Paper stack + clock on top
  box(0.3, 0.06, 0.24, M.paper, 0.05, 1.35, 0.02, cabinet).rotation.y = 0.1;
}

// Wall clock (east)
const clockHands = [];
{
  const c = group(2.4, 2.25, 0.02, 0, east);
  cyl(0.2, 0.2, 0.04, 12, M.black, 0, 0, 0, c).rotation.x = Math.PI / 2;
  cyl(0.17, 0.17, 0.045, 12, M.paper, 0, 0, 0.002, c).rotation.x = Math.PI / 2;
  const hm = box(0.012, 0.13, 0.01, M.black, 0, 0, 0.03, c);
  const hh = box(0.018, 0.09, 0.01, M.black, 0, 0, 0.035, c);
  hm.geometry.translate(0, 0.06, 0); hh.geometry.translate(0, 0.04, 0);
  clockHands.push(hh, hm);
}

// ---------- Chalkboard (south) — teaching ----------
const board = group(-1.2, 1.6, 0.01, 0, south);
{
  const bt = tex(192, 88, (g) => {
    g.fillStyle = '#23402f'; g.fillRect(0, 0, 192, 88);
    speckle(g, 192, 88, 400, ['#2b4a37', '#1e3729', 'rgba(255,255,255,.06)']);
    g.fillStyle = '#f0f0e6'; g.font = 'bold 11px monospace'; g.textBaseline = 'top';
    g.fillText('COURSES', 8, 6);
    g.fillRect(8, 19, 54, 1);
    g.font = '8px monospace'; g.fillStyle = '#e4e4d8';
    ['Intro to CS', 'Advanced Programming', 'Internet Programming', 'Intro to Web Design', 'Web Design & Vis', 'HCI', 'OOP / C / C++ / Java']
      .forEach((s, i) => g.fillText('- ' + s, 8, 24 + i * 9));
    // a sigmoid, because of course
    g.strokeStyle = '#ffe08a'; g.lineWidth = 1; g.beginPath();
    for (let x = 0; x <= 60; x++) { const y = 70 - 46 / (1 + Math.exp(-(x - 30) / 6)); x ? g.lineTo(122 + x, y) : g.moveTo(122 + x, y); }
    g.stroke();
    g.fillStyle = '#e4e4d8'; g.fillRect(120, 72, 66, 1); g.fillRect(120, 18, 1, 55);
    g.fillText('σ(x)', 150, 12);
  });
  box(2.72, 1.32, 0.05, M.trim, 0, 0, 0.025, board);
  plane(2.6, 1.2, lam({ map: bt }), 0, 0, 0.052, board);
  box(2.6, 0.03, 0.08, M.trim, 0, -0.63, 0.08, board);
  box(0.1, 0.02, 0.02, M.paper, 0.6, -0.605, 0.08, board);
  box(0.14, 0.04, 0.05, lam({ color: 0x7a5a3a }), 0.9, -0.6, 0.08, board);
  tag(board, 'teaching');
}

// ---------- Door (south) — exit ----------
const door = group(3, 0, 0.01, 0, south);
{
  box(1.14, 2.2, 0.06, M.trim, 0, 1.1, 0.03, door);
  const dt = tex(16, 32, (g) => {
    g.fillStyle = '#6e4529'; g.fillRect(0, 0, 16, 32);
    g.fillStyle = '#5a3720'; g.fillRect(2, 2, 12, 12); g.fillRect(2, 17, 12, 13);
    g.fillStyle = '#3a2112'; g.fillRect(2, 13, 12, 1); g.fillRect(13, 2, 1, 12); g.fillRect(2, 29, 12, 1); g.fillRect(13, 17, 1, 13);
  });
  box(1.0, 2.1, 0.05, lam({ map: dt }), 0, 1.05, 0.06, door);
  mesh(new THREE.SphereGeometry(0.04, 6, 4), M.brass, 0.4, 1.0, 0.11, door);
  const ex = tex(24, 8, (g) => {
    g.fillStyle = '#3a0a0a'; g.fillRect(0, 0, 24, 8);
    g.fillStyle = '#ff5544'; g.font = 'bold 7px monospace'; g.textBaseline = 'top'; g.fillText('EXIT', 4, 0);
  });
  box(0.42, 0.16, 0.06, M.black, 0, 2.36, 0.05, door);
  plane(0.38, 0.12, unlit({ map: ex }), 0, 2.36, 0.081, door);
  tag(door, 'exit');
  const l = new THREE.PointLight(0xff4433, 0.8, 1.6, 2);
  l.position.set(-3, 2.3, 3.7); scene.add(l);
}

// Posters on the south wall
{
  const poster = tex(24, 32, (g) => {
    g.fillStyle = '#121a3a'; g.fillRect(0, 0, 24, 32);
    const N = 20; // tiny land-cover tile
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const h = Math.sin(x / 3.2) + Math.cos(y / 2.7) + Math.sin((x + y) / 5);
      g.fillStyle = h > 1.3 ? LC.forest : h > 0.5 ? LC.grass : h > -0.3 ? LC.crop : h > -1 ? LC.urban : LC.water;
      g.fillRect(2 + x, 2 + y, 1, 1);
    }
    g.fillStyle = '#ffcc4d'; g.fillRect(2, 25, 20, 2); g.fillStyle = '#b6a9cf'; g.fillRect(2, 28, 14, 1);
  });
  const p = group(1.2, 1.65, 0.01, 0, south);
  box(0.66, 0.86, 0.03, M.black, 0, 0, 0.015, p);
  plane(0.6, 0.8, lam({ map: poster }), 0, 0, 0.032, p);
}

// ---------- Globe (centre) — research ----------
const globeTex = tex(96, 48, (g) => {
  let s = 41;
  const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const grid = (n) => Array.from({ length: n + 1 }, () => Array.from({ length: n + 1 }, r));
  const g1 = grid(6), g2 = grid(13);
  const sm = (t) => t * t * (3 - 2 * t);
  const sample = (gr, n, u, v) => {
    const fx = u * n, fy = v * n, i = Math.min(n - 1, fx | 0), j = Math.min(n - 1, fy | 0), a = sm(fx - i), b = sm(fy - j);
    const p = gr[i][j], q = gr[i + 1][j], c = gr[i][j + 1], d = gr[i + 1][j + 1];
    return p + (q - p) * a + (c - p) * b + (p - q - c + d) * a * b;
  };
  for (let y = 0; y < 48; y++) for (let x = 0; x < 96; x++) {
    const u = x / 96, v = y / 48;
    const h = sample(g1, 6, u, v) * 0.65 + sample(g2, 13, u, v) * 0.35;
    const lat = Math.abs(v - 0.5) * 2;
    let c;
    if (lat > 0.86) c = '#e8eef2';
    else if (h < 0.47) c = (x + y) % 2 && h > 0.43 ? '#3b6e8f' : '#2c5674';
    else if (lat > 0.7) c = LC.bare;
    else if (h > 0.66) c = LC.forest;
    else if (h > 0.58) c = LC.grass;
    else if (lat < 0.3 && h < 0.52) c = LC.crop;
    else c = h > 0.55 ? LC.urban : LC.crop;
    g.fillStyle = c; g.fillRect(x, y, 1, 1);
  }
});
const globe = group(0, 0, 0.5);
let globeSphere;
{
  cyl(0.28, 0.32, 0.06, 10, M.darkwood, 0, 0.03, 0, globe);
  cyl(0.05, 0.07, 0.85, 8, M.darkwood, 0, 0.45, 0, globe);
  const tilt = group(0, 1.2, 0, 0, globe);
  tilt.rotation.z = 0.41;
  globeSphere = mesh(new THREE.SphereGeometry(0.34, 16, 10), lam({ map: globeTex }), 0, 0, 0, tilt);
  const ring = mesh(new THREE.TorusGeometry(0.38, 0.014, 4, 20), M.brass, 0, 0, 0, tilt);
  ring.rotation.y = Math.PI / 2;
  cyl(0.01, 0.01, 0.82, 4, M.brass, 0, 0, 0, tilt);
  tag(globe, 'research');
}

// ---------- CRT screen animation ----------
function drawScreen(t) {
  const g = screenCanvasTex.userData.g;
  g.fillStyle = '#062010'; g.fillRect(0, 0, 160, 120);
  g.fillStyle = '#7dff9a'; g.font = '10px monospace'; g.textBaseline = 'top';
  const lines = ['C:\\> whoami', 'IVAN KITANOVSKI', ' Assoc. Professor', ' Software Architect', ' Data & AI Specialist', '', 'C:\\> type about.txt'];
  lines.forEach((s, i) => g.fillText(s, 6, 6 + i * 13));
  if (Math.floor(t * 2) % 2) g.fillRect(6 + 6 * 11, 6 + 6 * 13, 6, 10);
  g.fillStyle = 'rgba(0,0,0,.35)';
  for (let y = 0; y < 120; y += 2) g.fillRect(0, y, 160, 1);
  screenCanvasTex.needsUpdate = true;
}
drawScreen(0);

// ---------- Stops / tour ----------
const STOPS = {
  about:      { label: 'About',        tip: 'Terminal: About',          title: 'ABOUT.TXT',      cam: [0, 1.45, -2.05],   look: [0, 1.04, -3.5] },
  research:   { label: 'Research',     tip: 'Globe: Research',          title: 'RESEARCH.EXE',   cam: [0, 1.5, 1.9],      look: [0, 1.2, 0.5] },
  projects:   { label: 'Projects',     tip: 'Corkboard: Projects',      title: 'PROJECTS',       cam: [3.0, 1.6, -0.5],   look: [5, 1.62, -0.5] },
  pubs:       { label: 'Publications', tip: 'Bookshelf: Publications',  title: 'PUBLICATIONS',   cam: [-3.0, 1.5, -0.5],  look: [-5, 1.2, -0.5] },
  experience: { label: 'Experience',   tip: 'Filing cabinet: Experience', title: 'EXPERIENCE',   cam: [3.0, 1.5, 2.4],    look: [4.6, 0.85, 2.4] },
  education:  { label: 'Education',    tip: 'Diplomas: Education',      title: 'DIPLOMAS',       cam: [2.85, 1.6, -2.2],  look: [2.85, 1.72, -4] },
  teaching:   { label: 'Teaching',     tip: 'Chalkboard: Teaching',     title: 'TEACHING',       cam: [1.2, 1.6, 1.85],   look: [1.2, 1.6, 4] },
  contact:    { label: 'Contact',      tip: 'Telephone: Contact',       title: 'CONTACT',        cam: [0.9, 1.4, -2.45],  look: [0.72, 0.85, -3.32] },
  cv:         { label: 'CV',           tip: 'Floppy disk: Download CV', title: 'A:\\CV.PDF',     cam: [-0.62, 1.4, -2.45], look: [-0.6, 0.8, -3.22] },
  exit:       { label: 'Exit',         tip: 'Door: Classic site',       title: 'EXIT',           cam: [-3, 1.6, 2.3],     look: [-3, 1.3, 4] },
};
const ORDER = Object.keys(STOPS);

const tour = $('#tour');
ORDER.forEach((k, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.innerHTML = `<kbd>${(i + 1) % 10}</kbd>${STOPS[k].label}`;
  b.addEventListener('click', () => goTo(k));
  tour.appendChild(b);
});

// ---------- Player ----------
const pos = new THREE.Vector3(0, 1.6, 3.1);
let yaw = 0, pitch = -0.08;
let started = false;
let tween = null, walkTo = null, bob = 0;
const keys = {};

const OBST_BOX = [
  [-1.05, 1.05, -4, -3.05],   // desk
  [-5, -4.5, -1.75, 0.75],    // bookshelf
  [4.3, 5, 2.05, 2.75],       // cabinet
];
const OBST_CIRC = [[0, -2.75, 0.36], [0, 0.5, 0.42], [-4.4, -3.4, 0.35]];
const R = 0.25;
function collide(p) {
  p.x = Math.max(-W / 2 + R + 0.05, Math.min(W / 2 - R - 0.05, p.x));
  p.z = Math.max(-D / 2 + R + 0.05, Math.min(D / 2 - R - 0.05, p.z));
  for (const [cx, cz, r] of OBST_CIRC) {
    const dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz), m = r + R;
    if (d < m) { const k = d < 1e-4 ? 1 : m / d; p.x = cx + (d < 1e-4 ? m : dx * k); p.z = cz + dz * (d < 1e-4 ? 0 : k); }
  }
  for (const [x0, x1, z0, z1] of OBST_BOX) {
    const a = x0 - R, b = x1 + R, c = z0 - R, d = z1 + R;
    if (p.x > a && p.x < b && p.z > c && p.z < d) {
      const opts = [[p.x - a, 'x', a], [b - p.x, 'x', b], [p.z - c, 'z', c], [d - p.z, 'z', d]].sort((u, v) => u[0] - v[0]);
      p[opts[0][1]] = opts[0][2];
    }
  }
}

function angleTo(from, to) {
  const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2];
  return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
}

function goTo(key, idx) {
  const s = STOPS[key];
  // Back the camera off on narrow screens so the object fits.
  const f = Math.min(2.2, Math.max(1, 1.3 / camera.aspect));
  const to = new THREE.Vector3(
    s.look[0] + (s.cam[0] - s.look[0]) * f, s.cam[1], s.look[2] + (s.cam[2] - s.look[2]) * f);
  collide(to);
  const a = angleTo([to.x, to.y, to.z], s.look);
  let dy = a.yaw - yaw;
  dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  walkTo = null;
  started = true; hideIntro();
  tween = { from: pos.clone(), to, y0: yaw, y1: yaw + dy, p0: pitch, p1: a.pitch, t: 0,
            dur: reduceMotion ? 0.001 : 0.9, done: () => openPanel(key, idx) };
}

// ---------- Input ----------
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const tip = $('#tip');
let hovered = null, drag = null;

function pick(x, y) {
  ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(scene.children, true)[0];
  if (!hit) return null;
  return { owner: hit.object.userData.owner || null, floor: !!hit.object.userData.floor, point: hit.point, dist: hit.distance };
}
function setHover(owner, x, y) {
  if (owner !== hovered) { setGlow(hovered, false); setGlow(owner, true); hovered = owner; }
  canvas.classList.toggle('hot', !!owner);
  if (owner) {
    const k = owner.userData.key;
    tip.textContent = owner.userData.tip ? `${STOPS[k].label}: ${owner.userData.tip}` : STOPS[k].tip;
    tip.style.display = 'block';
    const tw = tip.offsetWidth;
    tip.style.left = Math.max(2, Math.min(x, innerWidth - tw - 30)) + 'px';
    tip.style.top = y + 'px';
  } else tip.style.display = 'none';
}

canvas.addEventListener('pointerdown', (e) => {
  drag = { x: e.clientX, y: e.clientY, moved: 0 };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (drag) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    drag.x = e.clientX; drag.y = e.clientY;
    if (drag.moved > 5 && started) {
      const s = e.pointerType === 'touch' ? 0.006 : 0.0045;
      yaw += dx * s; pitch = Math.max(-1.2, Math.min(1.2, pitch + dy * s));
      tween = null;
      setHover(null);
    }
  }
  if (!drag && e.pointerType === 'mouse' && started) {
    const p = pick(e.clientX, e.clientY);
    setHover(p && p.owner, e.clientX, e.clientY);
  }
});
canvas.addEventListener('pointerup', (e) => {
  const wasClick = drag && drag.moved <= 6;
  drag = null;
  if (!wasClick || !started) return;
  const p = pick(e.clientX, e.clientY);
  if (!p) return;
  if (p.owner) {
    const { key, idx } = p.owner.userData;
    if (p.dist > 3.2) goTo(key, idx);
    else openPanel(key, idx);
  } else if (p.floor) {
    walkTo = new THREE.Vector3(p.point.x, pos.y, p.point.z);
    collide(walkTo);
    tween = null;
  }
});
canvas.addEventListener('pointerleave', () => setHover(null));

addEventListener('keydown', (e) => {
  if (dlg.open || e.metaKey || e.ctrlKey || e.altKey) return;
  if (!started && (e.key === 'Enter' || e.key === ' ')) { start(); e.preventDefault(); return; }
  if (/^Digit\d$/.test(e.code)) { const i = (+e.code.slice(5) + 9) % 10; if (ORDER[i]) goTo(ORDER[i]); return; }
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
    keys[e.code] = true; e.preventDefault();
    if (!started) start();
  }
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

// ---------- Intro ----------
const intro = $('#intro');
function hideIntro() {
  if (!intro.hidden) intro.hidden = true;
}
function start() {
  started = true;
  hideIntro();
  setTimeout(() => { $('#hint').style.opacity = 0; }, 7000);
}
$('#enter').addEventListener('click', start);
$('#enter').focus({ preventScroll: true });

// ---------- Dialog ----------
const dlg = $('#win');
const body = $('#win-body');
function openPanel(key, idx) {
  const s = STOPS[key];
  $('#win-title').textContent = s.title;
  body.replaceChildren($('#t-' + key).content.cloneNode(true));
  body.scrollTop = 0;
  for (const k in keys) keys[k] = false;
  setHover(null);
  if (!dlg.open) dlg.showModal();
  if (idx != null) {
    const el = body.querySelector(`[data-i="${idx}"]`);
    if (el) { el.classList.add('hl'); requestAnimationFrame(() => el.scrollIntoView({ block: 'center' })); }
  }
  body.querySelectorAll('.copy').forEach((btn) => btn.addEventListener('click', () => {
    const row = btn.closest('.email-row'), note = row.querySelector('.copy-note'), email = row.querySelector('.email');
    body.querySelectorAll('.copy-note').forEach((n) => { n.textContent = ''; });
    const fallback = () => {
      const r = document.createRange(); r.selectNodeContents(email);
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
      note.textContent = 'Selected. Press Ctrl/Cmd+C.';
    };
    try { navigator.clipboard.writeText(email.textContent.trim()).then(() => { note.textContent = 'COPIED!'; }, fallback); }
    catch (err) { fallback(); }
  }));
}
$('#win-close').addEventListener('click', () => dlg.close());
dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

// ---------- Loop ----------
const clock = new THREE.Clock();
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
let screenT = 0;

function frame() {
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;

  if (!started) {
    yaw = Math.sin(t * 0.25) * 0.35;
  } else if (!dlg.open) {
    const fwd = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
    const str = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    const turn = (keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0);
    yaw += turn * 1.9 * dt;
    let moving = false;
    if (fwd || str) {
      tween = null; walkTo = null;
      const sp = 2.4 * dt / (fwd && str ? Math.SQRT2 : 1);
      pos.x += (-Math.sin(yaw) * fwd + Math.cos(yaw) * str) * sp;
      pos.z += (-Math.cos(yaw) * fwd - Math.sin(yaw) * str) * sp;
      moving = true;
    } else if (walkTo) {
      const dx = walkTo.x - pos.x, dz = walkTo.z - pos.z, d = Math.hypot(dx, dz);
      if (d < 0.05) walkTo = null;
      else {
        const sp = Math.min(d, 2.4 * dt);
        pos.x += (dx / d) * sp; pos.z += (dz / d) * sp;
        moving = true;
      }
    }
    if (moving) {
      const before = pos.clone();
      collide(pos);
      if (walkTo && before.distanceTo(pos) > 0.001) walkTo = null;
      bob += dt * 9;
    }
    if (tween) {
      tween.t = Math.min(1, tween.t + dt / tween.dur);
      const k = ease(tween.t);
      pos.lerpVectors(tween.from, tween.to, k);
      yaw = tween.y0 + (tween.y1 - tween.y0) * k;
      pitch = tween.p0 + (tween.p1 - tween.p0) * k;
      if (tween.t >= 1) { const d = tween.done; tween = null; if (d) d(); }
    } else if (!moving) pos.y += (1.6 - pos.y) * Math.min(1, dt * 4);
  }

  camera.position.set(pos.x, pos.y + (reduceMotion ? 0 : Math.sin(bob) * 0.025), pos.z);
  camera.rotation.set(pitch, yaw, 0);

  if (!reduceMotion) globeSphere.rotation.y += dt * 0.35;
  screenT += dt;
  if (screenT > 0.5) { screenT = 0; drawScreen(t); }
  const now = new Date();
  clockHands[0].rotation.z = -((now.getHours() % 12) + now.getMinutes() / 60) / 12 * Math.PI * 2;
  clockHands[1].rotation.z = -(now.getMinutes() / 60) * Math.PI * 2;

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
