// Engine video tin AI 9:16 — doc runs/<id>/spec.json + timeline.json, dung canh bang DOM + three.js.
// window.renderAt(t) ve khung hinh tai giay t (xac dinh, khong phu thuoc thoi gian thuc).
import * as THREE from 'three';

/* ===================== du lieu ===================== */
const RUN = (new URLSearchParams(location.search).get('run') || '').replace(/\/+$/, '');
const BASE = '/' + RUN + '/';
const SPEC = await (await fetch(BASE + 'spec.json?' + Date.now())).json();
try { const cfg = await (await fetch('/config.json?' + Date.now())).json(); for (const k in cfg) if (SPEC[k] === undefined) SPEC[k] = cfg[k]; } catch (e) { }
const TL = await (await fetch(BASE + 'work/timeline.json?' + Date.now())).json();
let ASSETS = {};
try { ASSETS = await (await fetch(BASE + 'assets/manifest.json?' + Date.now())).json(); } catch (e) { ASSETS = {}; }
await Promise.all(['900 100px "Inter Tight"', '800 100px "Inter Tight"', '700 40px "Be Vietnam Pro"', '800 40px "Be Vietnam Pro"',
  '500 40px "Be Vietnam Pro"', '600 40px "Be Vietnam Pro"', '500 40px "JetBrains Mono"', '700 40px "JetBrains Mono"']
  .map(f => document.fonts.load(f, 'ÁẮẤĐÊƠƯỹ Aa0')));
await document.fonts.ready;
const IMG = {};
await Promise.all(Object.entries(ASSETS).map(([k, f]) => new Promise(res => {
  const im = new Image(); im.onload = () => { IMG[k] = im; res(); }; im.onerror = () => res(); im.src = BASE + 'assets/' + f;
})));
const asset = k => (k && ASSETS[k]) ? BASE + 'assets/' + ASSETS[k] : null;

const W = 1080, H = 1920;
const C = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const P = (t, a, d) => C((t - a) / d);
const lerp = (a, b, x) => a + (b - a) * x;
const E = {
  o3: x => 1 - Math.pow(1 - C(x), 3), o5: x => 1 - Math.pow(1 - C(x), 5),
  io3: x => { x = C(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; },
  oB: x => { x = C(x); const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
};
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const fmt = (v, d = 0) => { const s = v.toFixed(d).split('.'); s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.'); return s.join(','); };
const esc = s => String(s ?? '');
const norm = s => String(s || '').toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N}]+/gu, '');

/* ===================== mau & style ===================== */
const ACC = SPEC.accent || '#ffb23f';
const CSSCOL = { amb: 'var(--amb)', grn: 'var(--grn)', red: 'var(--red)', ink: 'var(--ink)', mute: 'var(--mute)' };
const HEX = { amb: new THREE.Color(ACC).getHex(), grn: 0x3ddc84, red: 0xff4f4f, ink: 0xf4f1ea, grey: 0x6b675f, blue: 0x5aa9ff };
const hexOf = c => HEX[c] ?? (typeof c === 'string' && c.startsWith('#') ? new THREE.Color(c).getHex() : HEX.amb);
const cssOf = c => CSSCOL[c] || (typeof c === 'string' && c.startsWith('#') ? c : 'var(--amb)');
document.documentElement.style.setProperty('--amb', ACC);
const st = document.createElement('style');
st.textContent = `
.fit{white-space:nowrap;display:inline-block;transform-origin:left top}
.li{display:flex;gap:22px;align-items:flex-start;padding:22px 26px;margin-bottom:16px}
.li .n{flex:none;width:58px;height:58px;border-radius:16px;background:rgba(255,178,63,.14);border:1px solid rgba(255,178,63,.4);display:flex;align-items:center;justify-content:center;font:900 32px/1 var(--H);color:var(--amb)}
.li .t{font:800 38px/1.15 var(--B)} .li .d{font:600 26px/1.3 var(--B);color:#bdb7ac;margin-top:6px}
.term{font:500 34px/1.45 var(--M);padding:0 30px 28px}
.term .bar{display:flex;gap:10px;align-items:center;height:62px;color:#8f8b83;font:600 22px var(--M)}
.term .bar i{width:16px;height:16px;border-radius:50%;display:inline-block}
.term .c{color:#f4f1ea} .term .p{color:var(--amb)} .term .o{color:#9a968e;font-size:29px}
`;
document.head.appendChild(st);
document.getElementById('badge').textContent = SPEC.badge || '';
document.getElementById('date').textContent = SPEC.date || '';

/* ===================== DOM helpers ===================== */
const $ = s => document.querySelector(s);
function el(parent, cls, html = '', css = '') {
  const e = document.createElement('div'); if (cls) e.className = cls; e.innerHTML = html; if (css) e.style.cssText = css;
  parent.appendChild(e); return e;
}
function show(e, p, dy = 36, dx = 0, s0 = 1) {
  if (!e) return;
  e.style.opacity = C(p);
  e.style.transform = `translate(${(1 - p) * dx}px,${(1 - p) * dy}px) scale(${lerp(s0, 1, p)})` + (e.dataset.fs ? ` scale(${e.dataset.fs})` : '');
}
// chu to tu co lai cho vua chieu ngang (maxW px)
function fit(e, maxW = 960) {
  const w = e.scrollWidth; const f = w > maxW ? maxW / w : 1;
  e.dataset.fs = f.toFixed(4); e.style.transformOrigin = 'left top';
  return f;
}
function bigText(root, cls, html, css, maxW = 960) { const e = el(root, 'abs ' + cls + ' fit', html, css); fit(e, maxW); return e; }

/* ===================== THREE setup ===================== */
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x08090b, 16, 40);
const camera = new THREE.PerspectiveCamera(32, W / H, 0.1, 200);
scene.add(new THREE.HemisphereLight(0xfff3e0, 0x1a1410, 0.9));
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(4, 8, 6); scene.add(key);
const rim = new THREE.DirectionalLight(HEX.amb, 1.2); rim.position.set(-6, 3, -4); scene.add(rim);

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); draw(x, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const glowTex = canvasTex(256, 256, (x, w, h) => {
  const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
});
function glow(color, size, op = .5) {
  const m = new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false });
  const s = new THREE.Sprite(m); s.scale.set(size, size, 1); return s;
}
function mats(group, fn) { group.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(fn); }); }
function fade(group, a) {
  group.visible = a > 0.002;
  mats(group, m => { m.transparent = true; m.opacity = (m.userData.op !== undefined ? m.userData.op : m.userData.base) * a; });
}
function wrapText(x, text, maxW) {
  const words = String(text).split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (x.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}
function roundRect(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
function fitFont(x, text, weight, family, maxSize, maxW) {
  let s = maxSize; x.font = `${weight} ${s}px ${family}`;
  while (x.measureText(text).width > maxW && s > 20) { s -= 2; x.font = `${weight} ${s}px ${family}`; }
  return s;
}

const bgPts = (() => {
  const n = 1400, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = (hash(i) - .5) * 30; pos[i * 3 + 1] = (hash(i + 99) - .5) * 44; pos[i * 3 + 2] = -4 - hash(i + 7) * 22; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffe2b0, size: 0.06, transparent: true, opacity: .55, depthWrite: false }));
  scene.add(p); return p;
})();
const v3 = new THREE.Vector3();
function proj(vec, e, dx = 0, dy = 0) { v3.copy(vec).project(camera); e.style.left = ((v3.x + 1) / 2 * W + dx) + 'px'; e.style.top = ((1 - v3.y) / 2 * H + dy) + 'px'; }
function camLook(px, py, pz, tx, ty, tz) { camera.position.set(px, py, pz); camera.lookAt(tx, ty, tz); }
function bar(w, d, color, emis = 0.35) {
  const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: emis, roughness: .45, metalness: .1, transparent: true });
  const geo = new THREE.BoxGeometry(w, 1, d); geo.translate(0, .5, 0);
  const mesh = new THREE.Mesh(geo, m);
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .25 })));
  return mesh;
}
function grid(size = 12, div = 24, y = 0) {
  const gh = new THREE.GridHelper(size, div, 0x3a3833, 0x24231f); gh.position.y = y; gh.material.transparent = true; gh.material.opacity = .7; return gh;
}

/* ===================== khung canh + dong bo theo loi ===================== */
const scenesDiv = $('#scenes');
const SCENES = [];
const headBlock = (root, tag, color) => {
  const e = el(root, 'abs', `<div class="tag">${esc(tag)}</div>`, 'left:60px;top:176px');
  if (color) e.firstChild.style.color = cssOf(color); return e;
};
function makeScene(cfg, idx) {
  const T = TL.scenes[idx];
  const L = T.lines.map(i => { const l = TL.lines[i - 1]; return { start: l.start - T.start, end: l.end - T.start, len: Math.max(.2, l.end - l.start), gi: i }; });
  const s = { cfg, root: el(scenesDiv, 'scene'), g: new THREE.Group(), T: { ...T, dur: T.end - T.start, L } };
  scene.add(s.g);
  // thoi diem (giay, tinh tu dau canh) cua cau i, phan f (0..1)
  s.at = (i = 0, f = 0) => { const l = L[Math.max(0, Math.min(L.length - 1, i | 0))]; return l.start + l.len * f; };
  s.ev = (o, defLine = 0, defFrac = 0) => {
    if (o && o.word) { const w = s.word(o.word); if (w !== null) return w; }
    if (o && (o.line !== undefined || o.frac !== undefined)) return s.at(o.line ?? defLine, o.frac ?? defFrac);
    return s.at(defLine, defFrac);
  };
  s.word = (str) => {
    const n = norm(str); if (!n) return null;
    const ws = (TL.words || []).filter(w => T.lines.includes(w.line));
    const w = ws.find(x => norm(x.w) === n) || ws.find(x => norm(x.w).startsWith(n)) || ws.find(x => norm(x.w).includes(n));
    return w ? w.start - T.start - 0.05 : null;
  };
  const fn = BUILDERS[cfg.type];
  if (!fn) throw new Error('Loai canh khong ho tro: ' + cfg.type);
  fn(s, cfg);
  mats(s.g, m => { m.userData.base = m.opacity; });
  return s;
}

/* ===================== cac loai canh ===================== */
const BUILDERS = {};

/* ---- hook: tieu de lon + tai lieu 3D bay vao + 3 o so lieu ---- */
BUILDERS.hook = (s, c) => {
  const r = s.root, doc = c.doc || {};
  s.tag = headBlock(r, c.tag || 'Tin nóng');
  s.t1 = bigText(r, 'h1', esc(c.title?.[0]), 'left:54px;top:236px;font-size:150px');
  s.t2 = bigText(r, 'h1 amb', esc(c.title?.[1]), 'left:56px;top:380px;font-size:104px');
  s.t3 = el(r, 'abs sub', esc(c.sub), 'left:60px;top:505px;right:60px');
  const stats = (c.stats || []).slice(0, 3), n = stats.length || 1, wC = Math.floor((960 - (n - 1) * 20) / n);
  s.stats = stats.map((d, i) => el(r, 'abs card', `<div class="fit" style="font:900 54px/1 var(--H);letter-spacing:-.035em;color:${cssOf(d.c)}">${esc(d.v)}</div><div style="font:600 23px/1.25 var(--B);color:#bdb7ac;margin-top:10px">${esc(d.l)}</div>`,
    `left:${60 + i * (wC + 20)}px;top:1140px;width:${wC}px;padding:22px 22px 20px;border-radius:22px;overflow:hidden`));
  s.stats.forEach(e => { const f = e.firstChild; const k = Math.min(1, (e.clientWidth - 44) / f.scrollWidth); f.style.transform = `scale(${k})`; f.style.transformOrigin = 'left top'; });
  const tex = canvasTex(1024, 1448, (x, w, h) => {
    x.fillStyle = '#ece7dc'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#1b1a18'; x.font = '700 30px "JetBrains Mono"'; x.fillText(esc(doc.kicker || 'BẢN TIN').slice(0, 44), 70, 104);
    x.fillStyle = '#b9b2a4'; x.fillRect(70, 130, w - 140, 3);
    x.fillStyle = '#141311'; fitFont(x, esc(doc.title || c.title?.[0] || ''), 900, '"Inter Tight"', 118, w - 140); x.fillText(esc(doc.title || c.title?.[0] || ''), 66, 270);
    x.font = '700 38px "Be Vietnam Pro"'; x.fillStyle = '#6f685c'; x.fillText(esc(doc.sub || '').slice(0, 48), 70, 330);
    for (let i = 0; i < 26; i++) {
      const y = 420 + i * 36, ww = (i % 7 === 6) ? 360 + hash(i) * 200 : w - 140 - hash(i + 3) * 120;
      x.fillStyle = i % 9 === 0 ? '#8d8576' : '#cfc8ba'; x.fillRect(70, y, ww, i % 9 === 0 ? 16 : 12);
    }
    if (doc.stamp) {
      x.save(); x.translate(w - 250, h - 250); x.rotate(-0.25);
      x.strokeStyle = '#d23b3b'; x.lineWidth = 8; roundRect(x, -190, -70, 380, 140, 18); x.stroke();
      x.fillStyle = '#d23b3b'; x.textAlign = 'center'; fitFont(x, doc.stamp, 900, '"Inter Tight"', 64, 340); x.fillText(doc.stamp, 0, 20); x.restore();
    }
    x.fillStyle = '#9a9384'; x.font = '500 24px "JetBrains Mono"'; x.fillText('minh hoạ', 70, h - 60);
  });
  s.pages = [];
  for (let k = 0; k < 3; k++) {
    const pg = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 3.25), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color().setScalar(k === 0 ? 1 : .55), transparent: true }));
    pg.add(mesh, new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color: HEX.amb, transparent: true, opacity: .9 })));
    s.g.add(pg); s.pages.push(pg);
  }
  const gl = glow(HEX.amb, 7, .35); gl.position.set(0, 0, -1.5); s.g.add(gl);
  s.update = (t) => {
    show(s.tag, E.o3(P(t, 0.05, .4)), 20); show(s.t1, E.o5(P(t, 0.0, .5)), 70); show(s.t2, E.o5(P(t, 0.18, .5)), 70); show(s.t3, E.o3(P(t, 0.45, .5)), 30);
    s.stats.forEach((e, i) => show(e, E.oB(P(t, 1.0 + i * 0.28, .5)), 50, 0, .85));
    const base = [[0, 0, .35, -0.1, 0], [0.62, 0.1, 0, 0.22, 0.06], [-0.62, 0.05, -0.35, -0.3, -0.07]];
    s.pages.forEach((pg, k) => {
      const p = E.o5(P(t, 0.05 + k * 0.12, 1.0)), b = base[k];
      pg.position.set(lerp(b[0] * 3, b[0], p), lerp(-3, b[1], p) + Math.sin(t * 1.2 + k) * 0.04, lerp(-9, b[2], p));
      pg.rotation.set(lerp(-1.2, 0, p) + Math.sin(t * .8 + k) * 0.03, lerp(2.4, b[3], p) + Math.sin(t * .6 + k) * 0.05, b[4]);
    });
    s.g.position.set(0, -0.42, 0); s.g.rotation.y = -0.12 + t * 0.03;
    camLook(0.15, 0.1 + t * 0.02, lerp(14.5, 13.2, E.io3(t / s.T.dur)), 0, -0.25, 0);
  };
};

/* ---- sources: chong the nguon tin (chu hoac anh chup man hinh) ---- */
function srcCardTex(cd) {
  const W2 = 1400, HB = 92, im = cd.img && IMG[cd.img];
  const bodyH = im ? Math.round(Math.min(im.height, im.width * 0.75) * (W2 - 40) / im.width) + 20 : 250;
  const H2 = HB + bodyH;
  const tex = canvasTex(W2, H2, (x, w, h) => {
    x.save(); roundRect(x, 0, 0, w, h, 30); x.clip(); x.fillStyle = '#141518'; x.fillRect(0, 0, w, h);
    x.fillStyle = ACC; x.font = '700 34px "JetBrains Mono"'; x.fillText(esc(cd.h).toUpperCase().slice(0, 48), 44, 58);
    if (im) {
      x.fillStyle = '#8f8b83'; x.font = '500 24px "JetBrains Mono"'; x.textAlign = 'right'; x.fillText('ẢNH CHỤP MÀN HÌNH', w - 44, 56); x.textAlign = 'left';
      const sh = Math.min(im.height, im.width * 0.75); x.drawImage(im, 0, 0, im.width, sh, 20, HB, w - 40, bodyH - 20);
    } else {
      x.fillStyle = '#f4f1ea'; x.font = '800 54px "Inter Tight"';
      wrapText(x, esc(cd.t), w - 88).slice(0, 3).forEach((ln, k) => x.fillText(ln, 44, HB + 70 + k * 66));
    }
    x.restore(); x.strokeStyle = 'rgba(255,255,255,.16)'; x.lineWidth = 3; roundRect(x, 1.5, 1.5, w - 3, h - 3, 29); x.stroke();
  });
  return { tex, aspect: H2 / W2 };
}
BUILDERS.sources = (s, c) => {
  const r = s.root;
  s.tag = headBlock(r, c.tag || 'Nguồn tin');
  s.t1 = bigText(r, 'h2', esc(c.title?.[0]), 'left:56px;top:230px;font-size:112px');
  s.t2 = bigText(r, 'h2 amb', esc(c.title?.[1]), 'left:58px;top:338px;font-size:112px');
  s.t3 = el(r, 'abs sub', esc(c.sub), 'left:60px;top:470px;right:60px');
  s.cards = (c.cards || []).slice(0, 6).map((cd) => {
    const { tex, aspect } = srcCardTex(cd);
    const geo = new THREE.PlaneGeometry(3.3, 3.3 * aspect); geo.translate(0, -3.3 * aspect / 2, 0);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true })); s.g.add(m); return m;
  });
  s.update = (t) => {
    show(s.tag, E.o3(P(t, 0.0, .35)), 20); show(s.t1, E.o5(P(t, 0.05, .45)), 60); show(s.t2, E.o5(P(t, 0.18, .45)), 60); show(s.t3, E.o3(P(t, 0.4, .45)), 30);
    const N = s.cards.length, stp = Math.max(.3, (s.T.dur - 1.2) / Math.max(1, N));
    const arr = s.cards.map((m, i) => E.o5(P(t, 0.35 + i * stp, .55)));
    s.cards.forEach((m, i) => {
      const p = arr[i]; let j = 0; for (let k = i + 1; k < N; k++) j += arr[k];
      m.position.set(lerp(4.8, (i % 2 ? 0.06 : -0.06), p), j * 0.21 + Math.sin(t * 1.3 + i) * 0.015, -j * 0.32 + i * 0.001);
      m.rotation.set(-0.04, lerp(-0.9, (i % 2 ? -0.06 : 0.06), p), lerp(-0.12, (i % 2 ? 0.012 : -0.012), p));
      m.scale.setScalar(1 - j * 0.035); m.material.userData.op = p * (1 - Math.max(0, j - 3.2));
    });
    s.g.position.set(0, 0.42, 0);
    camLook(0, lerp(0.2, -0.25, E.io3(t / s.T.dur)), 13.6, 0, lerp(-0.4, -0.75, E.io3(t / s.T.dur)), 0);
  };
};

/* ---- bars: cot 3D + so dem lon (vd doanh thu theo nam) ---- */
BUILDERS.bars = (s, c) => {
  const r = s.root, cn = c.counter || {};
  s.tag = headBlock(r, c.tag || '', c.tagColor || cn.color);
  s.l1 = el(r, 'abs lbl', esc(cn.label), 'left:60px;top:236px');
  s.n1 = el(r, 'abs big fit', '0', `left:52px;top:282px;font-size:170px;color:${cssOf(cn.color || 'amb')}`);
  s.chip = c.chip ? el(r, 'abs chip', c.chip.html || esc(c.chip), 'left:60px;top:470px') : null;
  const sec = c.second;
  if (sec) { s.l2 = el(r, 'abs lbl', esc(sec.label), 'left:60px;top:570px'); s.n2 = bigText(r, 'h2', esc(sec.text), `left:56px;top:612px;font-size:110px;color:${cssOf(sec.color || 'amb')}`); }
  const B = (c.bars || []).slice(0, 5), mx = Math.max(...B.map(b => b.value), 1e-6);
  s.k = 2.2 / mx; const n = B.length, stp = Math.min(1.25, 3.4 / Math.max(1, n - 1)), wd = Math.min(.86, stp * .7);
  s.bars = B.map((b, i) => { const m = bar(wd, wd, hexOf(b.color || 'grn')); m.position.set((i - (n - 1) / 2) * stp, 0, 0); m.userData = { v: b.value, cfg: b }; s.g.add(m); return m; });
  s.g.add(grid(10, 20, 0));
  const gl = glow(hexOf(cn.color || 'grn'), 5, .25); gl.position.set(0, 1, -1); s.g.add(gl);
  s.labels = B.map(b => el(r, 'bl', `<small>${esc(b.label)}</small><b style="color:${cssOf(b.color || 'grn')}">${esc(b.text ?? fmt(b.value, 1))}</b>`));
  const lateT = Math.max(0, ...B.map(b => b.line ? s.ev(b) : 0));
  s.update = (t) => {
    show(s.tag, E.o3(P(t, 0, .35)), 20); show(s.l1, E.o3(P(t, 0.05, .4)), 20);
    const dec = cn.dec ?? 0;
    s.n1.innerHTML = esc(cn.prefix || '') + fmt(lerp(cn.from ?? 0, cn.to ?? 0, E.o3(P(t, 0.15, 1.6))), dec) + `<span style="font-size:70px;letter-spacing:-.02em"> ${esc(cn.unit || '')}</span>`;
    fit(s.n1); show(s.n1, E.o5(P(t, 0.05, .45)), 50);
    if (s.chip) show(s.chip, E.oB(P(t, s.ev(c.chip, 0, .62), .45)), 30, 0, .8);
    if (sec) { const t2 = s.ev(sec, 1, 0); show(s.l2, E.o3(P(t, t2 - 0.05, .4)), 20); show(s.n2, E.o5(P(t, t2 + 0.05, .5)), 50); }
    const gy = s.bars.map((b, i) => { const t0 = b.userData.cfg.line ? s.ev(b.userData.cfg) + .1 : 0.2 + i * 0.12; return E.o5(P(t, t0, b.userData.cfg.line ? 1.2 : 1.3)); });
    s.bars.forEach((b, i) => { b.scale.y = Math.max(0.001, b.userData.v * s.k * gy[i]); b.visible = gy[i] > 0.001; });
    const m = lateT > 0 ? E.io3(P(t, lateT - 0.1, 1.0)) : 1;
    s.g.position.set(0, -1.55, 0); s.g.rotation.y = lerp(-0.35, -0.18, E.io3(t / s.T.dur));
    camLook(lerp(0.3, 0.2, m), lerp(-0.45, 0.05, m), lerp(8.2, 12.2, m), lerp(-0.2, 0, m), lerp(-1.15, -0.7, m), 0);
    s.post = () => s.bars.forEach((b, i) => {
      const p = new THREE.Vector3(); b.localToWorld(p.set(0, 1.02, 0)); proj(p, s.labels[i], 0, -8);
      s.labels[i].style.opacity = gy[i] > 0.05 ? C(gy[i] * 1.5) : 0;
    });
  };
};

/* ---- compare: cot A vs cot B nhieu lop, khoang chenh (vd doanh thu vs chi phi -> lo) ---- */
BUILDERS.compare = (s, c) => {
  const r = s.root, cn = c.counter || {}, A = c.a || {}, Bc = c.b || {}, G = c.gap;
  s.tag = headBlock(r, c.tag || '', c.tagColor);
  s.l1 = el(r, 'abs lbl', esc(cn.label), 'left:60px;top:236px');
  s.n1 = el(r, 'abs big fit', '0', `left:52px;top:282px;font-size:170px;color:${cssOf(cn.color || 'ink')}`);
  s.chip = c.chip ? el(r, 'abs chip', c.chip.html || esc(c.chip), 'left:60px;top:470px') : null;
  if (G) s.gapH = el(r, 'abs', `<div class="lbl">${esc(G.label)}</div><div class="big fit" style="font-size:170px;margin-top:10px;color:${cssOf(G.color || 'red')}">${esc(G.big)}</div>`, 'left:56px;top:236px');
  const segs = (Bc.segs || []).slice(0, 3), tot = segs.reduce((a, b) => a + b.value, 0), mx = Math.max(A.value || 0, tot, 1e-6);
  s.k = 1.9 / mx;
  s.A = bar(0.95, 0.95, hexOf(A.color || 'grn')); s.A.position.set(-0.8, 0, 0); s.g.add(s.A);
  s.S = segs.map(sg => { const m = bar(0.95, 0.95, hexOf(sg.color || 'amb'), sg.color === 'grey' ? .15 : .35); m.position.set(0.8, 0, 0); s.g.add(m); return m; });
  if (G) {
    const gg = new THREE.BoxGeometry(0.95, 1, 0.95); gg.translate(0, .5, 0);
    s.ghost = new THREE.Mesh(gg, new THREE.MeshBasicMaterial({ color: hexOf(G.color || 'red'), transparent: true, opacity: .28, depthWrite: false }));
    s.ghost.add(new THREE.LineSegments(new THREE.EdgesGeometry(gg), new THREE.LineBasicMaterial({ color: hexOf(G.color || 'red'), transparent: true, opacity: 1 })));
    s.ghost.position.set(-0.8, 0, 0); s.g.add(s.ghost);
  }
  s.g.add(grid(10, 20, 0));
  s.lA = el(r, 'bl', `<small>${esc(A.label)}</small><b style="color:${cssOf(A.color || 'grn')}">${esc(A.text ?? fmt(A.value, 2))}</b>`);
  s.lB = el(r, 'bl', `<small>${esc(Bc.label)}</small><b>${esc(Bc.text ?? fmt(tot, 2))}</b>`);
  s.inA = el(r, 'bl', `<small style="color:#04200f;margin:0">${esc(A.label)}</small><b style="color:#04200f;font-size:38px">${esc(A.text ?? '')}</b>`, 'transform:translate(-50%,-50%)');
  s.inS = segs.map(sg => el(r, 'bl', `<small style="margin:0;color:${sg.color === 'grey' ? '#e9e4d9' : '#1b1204'}">${esc(sg.label)}</small><b style="font-size:38px;color:${sg.color === 'grey' ? '#e9e4d9' : '#1b1204'}">${esc(sg.text ?? fmt(sg.value, 2))}</b>`, 'transform:translate(-50%,-50%)'));
  if (G) s.gl2 = el(r, 'bl', `<b style="font-size:44px;color:${cssOf(G.color || 'red')}">${esc(G.short || G.big)}</b>`, 'transform:translate(-50%,-50%)');
  s.update = (t) => {
    show(s.tag, E.o3(P(t, 0, .35)), 20); show(s.l1, E.o3(P(t, 0.05, .4)), 20);
    s.n1.innerHTML = esc(cn.prefix || '') + fmt(lerp(cn.from ?? 0, cn.to ?? 0, E.o3(P(t, 0.15, 1.6))), cn.dec ?? 0) + `<span style="font-size:70px"> ${esc(cn.unit || '')}</span>`;
    fit(s.n1); show(s.n1, E.o5(P(t, 0.05, .45)), 50);
    const tc = c.chip ? s.ev(c.chip, 0, .55) : 99;
    if (s.chip) show(s.chip, E.oB(P(t, tc, .45)), 30, 0, .8);
    const tg = G ? s.ev(G, 1, 0) : 999, lp = E.o5(P(t, tg - 0.05, .45));
    if (G) {
      const shake = t > tg && t < tg + .35 ? Math.sin(t * 90) * 10 * (1 - (t - tg) / .35) : 0;
      s.gapH.style.opacity = lp; s.gapH.style.transform = `translate(${shake}px,${(1 - lp) * 40}px) scale(${lerp(1.25, 1, lp)})`;
      fit(s.gapH.lastChild);
      s.l1.style.opacity = C(1 - lp * 2); s.n1.style.opacity = C(E.o5(P(t, 0.05, .45)) - lp * 2);
      if (s.chip) s.chip.style.opacity = C(1 - lp * 2) * C(E.oB(P(t, tc, .45)));
      s.tag.firstChild.style.color = lp > .5 ? cssOf(G.color || 'red') : '';
    }
    const k = s.k, ga = E.o3(P(t, 0.15, 1.1));
    s.A.scale.y = Math.max(.001, (A.value || 0) * k * ga);
    let y = 0; const gs = segs.map((sg, i) => E.o3(P(t, i === 0 ? 0.3 : tc - 0.1 + (i - 1) * .3, i === 0 ? 1.4 : .9)));
    s.S.forEach((m, i) => { m.position.y = y; m.scale.y = Math.max(.001, segs[i].value * k * gs[i]); m.visible = gs[i] > .001; y += segs[i].value * k * gs[i]; });
    const gl = E.o5(P(t, tg, .8));
    if (s.ghost) { s.ghost.position.y = (A.value || 0) * k; s.ghost.scale.y = Math.max(.001, Math.max(0, tot - (A.value || 0)) * k * gl); s.ghost.visible = gl > .001; s.ghost.material.userData.op = .22 + Math.sin(t * 7) * .06; }
    s.g.position.set(0, -1.6, 0); s.g.rotation.y = lerp(0.42, 0.18, E.io3(t / s.T.dur));
    camLook(0.1, lerp(0.2, 0.5, E.io3(t / s.T.dur)), lerp(11.8, 11.0, E.io3(t / s.T.dur)), 0, -0.7, 0);
    s.post = () => {
      const p = new THREE.Vector3();
      s.A.localToWorld(p.set(0, 1, 0)); proj(p, s.lA, 0, -8); s.lA.style.opacity = C(ga * 2) * C(1 - gl * 3);
      s.A.localToWorld(p.set(0, .5, .5)); proj(p, s.inA); s.inA.style.opacity = C(gl * 3);
      const top = s.S.filter(m => m.visible).pop() || s.S[0]; if (top) { top.localToWorld(p.set(0, 1, 0)); proj(p, s.lB, 0, -8); } s.lB.style.opacity = C(gs[0] * 2);
      s.S.forEach((m, i) => { m.localToWorld(p.set(0, .5, .5)); proj(p, s.inS[i]); s.inS[i].style.opacity = C((gs[i] - .6) * 3) * (m.scale.y > .35 ? 1 : 0); });
      if (s.ghost) { s.ghost.localToWorld(p.set(0, .5, .5)); proj(p, s.gl2); s.gl2.style.opacity = C((gl - .5) * 3); }
    };
  };
};

/* ---- donut: vong tron chia phan + chu giua + chu giai ---- */
BUILDERS.donut = (s, c) => {
  const r = s.root, parts = (c.parts || []).slice(0, 3), tot = parts.reduce((a, b) => a + b.value, 0) || 1;
  s.tag = headBlock(r, c.tag || '', c.tagColor);
  s.t1 = bigText(r, 'h2', c.title || '', 'left:56px;top:230px;font-size:112px');
  s.t2 = el(r, 'abs sub', esc(c.sub), 'left:60px;top:352px;right:60px');
  s.mid = el(r, 'abs', `<div style="font:900 132px/1 var(--H);letter-spacing:-.04em">${esc(c.center?.big)}</div><div style="font:700 28px/1.25 var(--B);color:#bdb7ac;margin-top:8px">${esc(c.center?.small)}</div>`, 'left:0;width:1080px;top:655px;text-align:center');
  s.leg = el(r, 'abs', parts.map(p => `<div class="card" style="padding:20px 26px;display:flex;gap:20px;align-items:center;margin-bottom:14px">
      <div style="width:26px;height:26px;border-radius:7px;background:${cssOf(p.color === 'grey' ? '#77736b' : p.color)};flex:none"></div>
      <div><div style="font:900 44px/1 var(--H);color:${p.color === 'grey' ? 'var(--ink)' : cssOf(p.color)}">${esc(p.label)}</div><div style="font:600 25px/1.3 var(--B);color:#bdb7ac;margin-top:6px">${esc(p.text)}</div></div></div>`).join(''),
    'left:120px;right:120px;top:1052px');
  s.R = 1.22; s.meshes = parts.map(p => {
    const mt = p.color === 'grey' ? new THREE.MeshStandardMaterial({ color: 0x77736b, emissive: 0x2a2825, roughness: .5, transparent: true })
      : new THREE.MeshStandardMaterial({ color: hexOf(p.color), emissive: hexOf(p.color), emissiveIntensity: .5, roughness: .4, transparent: true });
    const m = new THREE.Mesh(new THREE.BufferGeometry(), mt); s.g.add(m); return m;
  });
  const gl = glow(hexOf(parts[parts.length - 1]?.color || 'red'), 5, .2); gl.position.set(0, 0, -1); s.g.add(gl);
  s.last = '';
  s.update = (t) => {
    show(s.tag, E.o3(P(t, 0, .35)), 20); show(s.t1, E.o5(P(t, 0.05, .45)), 60); show(s.t2, E.o3(P(t, 0.35, .45)), 30);
    const full = Math.PI * 2; let a0 = Math.PI / 2;
    const sw = parts.map((p, i) => E.io3(P(t, i === 0 ? s.at(0, .28) : 0.1 + (i - 1) * .3, 1.0)));
    const key = sw.map(x => Math.round(x * 200)).join('_');
    if (key !== s.last) {
      s.last = key;
      parts.forEach((p, i) => {
        const ang = full * p.value / tot - 0.05;
        s.meshes[i].geometry.dispose(); s.meshes[i].geometry = new THREE.TorusGeometry(s.R, 0.26, 24, 128, Math.max(0.001, ang * sw[i]));
      });
    }
    // phan 0 di theo chieu kim dong ho tu dinh, cac phan sau noi tiep nguoc lai
    // phan 0: tu dinh di nguoc chieu kim dong ho; phan 1, 2: tu dinh di theo chieu kim dong ho, noi tiep nhau
    let before = 0;
    parts.forEach((p, i) => {
      const ang = full * p.value / tot;
      if (i === 0) s.meshes[i].rotation.z = Math.PI / 2 + 0.03;
      else { s.meshes[i].rotation.z = Math.PI / 2 - before - (ang - 0.05) * sw[i]; before += ang; }
      s.meshes[i].visible = sw[i] > 0.002;
    });
    s.g.rotation.set(-0.35 + Math.sin(t * .7) * .05, 0.25 + Math.sin(t * .5) * 0.08, 0);
    s.g.position.set(0, 0.42, 0);
    const sm = sw[0] ?? 1; s.mid.style.opacity = C((sm - .3) * 2); s.mid.style.transform = `scale(${lerp(.8, 1, E.o3(sm))})`;
    show(s.leg, E.o5(P(t, s.at(0, .45), .5)), 40);
    camLook(0, 0, 11.5, 0, -0.05, 0);
  };
};

/* ---- towers: nhieu cot (doi tac/hang muc) hien khi doc ten + bang khoa % ---- */
BUILDERS.towers = (s, c) => {
  const r = s.root, cn = c.counter || {}, items = (c.items || []).slice(0, 7), pn = c.panel;
  s.tag = headBlock(r, c.tag || '');
  s.n1 = el(r, 'abs big fit', '0', `left:50px;top:226px;font-size:200px;color:${cssOf(cn.color || 'amb')}`);
  s.chip = c.chip ? el(r, 'abs chip', c.chip.html || esc(c.chip), 'left:60px;top:440px') : null;
  if (pn) {
    s.lock = el(r, 'abs card', `<div style="display:flex;align-items:center;gap:22px">
        ${pn.icon === 'none' ? '' : `<svg width="62" height="72" viewBox="0 0 24 28" fill="none" stroke="${cssOf(pn.color || 'red')}" stroke-width="2.4"><rect x="2" y="12" width="20" height="14" rx="3" fill="rgba(255,79,79,.15)"/><path d="M6 12V8a6 6 0 0 1 12 0v4"/><circle cx="12" cy="19" r="1.8" fill="currentColor"/></svg>`}
        <div><div style="font:900 84px/0.9 var(--H);letter-spacing:-.04em;color:${cssOf(pn.color || 'red')}">${esc(pn.big)}</div><div style="font:800 34px/1.1 var(--H);text-transform:uppercase;margin-top:6px">${esc(pn.label)}</div></div></div>
        <div style="height:14px;border-radius:7px;background:rgba(255,255,255,.08);margin-top:16px;overflow:hidden"><div class="fill" style="height:100%;width:0;background:${cssOf(pn.color || 'red')}"></div></div>
        <div style="font:600 23px/1.3 var(--B);color:#bdb7ac;margin-top:10px">${esc(pn.note)}</div>`,
      `left:60px;right:60px;top:440px;padding:24px 30px;border-color:rgba(255,255,255,.18);background:rgba(20,12,12,.92)`);
    s.fill = s.lock.querySelector('.fill');
  }
  const mx = Math.max(...items.map(i => i.value), 1e-6), n = items.length, stp = Math.min(.66, 3.1 / Math.max(1, n - 1)), wd = stp * .78;
  s.k = 1.75 / mx;
  s.towers = items.map((it, i) => { const b = bar(wd, wd, hexOf(it.color || 'amb'), .3); const x = (i - (n - 1) / 2) * stp; b.position.set(x, 0, -Math.abs(x) * 0.25); b.userData = { v: it.value, it }; s.g.add(b); return b; });
  s.g.add(grid(12, 24, 0));
  const gl = glow(HEX.amb, 6, .22); gl.position.set(0, 1.2, -1.5); s.g.add(gl);
  s.labels = items.map(it => el(r, 'bl', `<small style="font-size:21px">${esc(it.label)}</small><b style="font-size:40px">${esc(it.text ?? fmt(it.value, it.value % 1 ? 1 : 0))}</b>`));
  s.cBase = items.map(it => new THREE.Color(hexOf(it.color || 'amb')));
  s.cHL = new THREE.Color(hexOf(pn?.color || 'red')); s.cDim = new THREE.Color(HEX.grey);
  s.update = (t) => {
    if (!s.nameT) s.nameT = items.map((it, i) => (it.word && s.word(it.word) !== null) ? s.word(it.word) : s.at(0, .35 + .55 * i / Math.max(1, n - 1)));
    const L = s.T.L, tp = pn ? s.ev(pn, 1, 0) : 999;
    show(s.tag, E.o3(P(t, 0, .35)), 20);
    s.n1.innerHTML = esc(cn.prefix || '') + fmt(lerp(0, cn.to ?? 0, E.o3(P(t, 0.1, 1.5))), cn.dec ?? 0) + `<span style="font-size:80px;letter-spacing:-.02em"> ${esc(cn.unit || '')}</span>`;
    fit(s.n1); show(s.n1, E.o5(P(t, 0.0, .45)), 60);
    const lp = E.o5(P(t, tp - 0.05, .5)), tc = c.chip ? s.ev(c.chip, 0, .8) : 99;
    if (s.chip) s.chip.style.opacity = C(E.oB(P(t, tc, .45))) * C(1 - lp), s.chip.style.transform = `translateY(${(1 - C(E.oB(P(t, tc, .45)))) * 30}px)`;
    if (s.lock) { show(s.lock, lp, 50, 0, .92); s.fill.style.width = ((pn.fill ?? 80) * E.io3(P(t, tp + 0.2, 1.1))) + '%'; }
    s.towers.forEach((b, i) => {
      const gi = E.o5(P(t, 0.2 + i * 0.1, 1.1));
      b.scale.y = Math.max(.001, b.userData.v * s.k * gi); b.visible = gi > .001;
      const hit = P(t, s.nameT[i], .5); b.userData.hit = hit; b.userData.g = gi;
      b.material.emissiveIntensity = .3 + (hit > 0 && hit < 1 ? (1 - hit) * .9 : 0);
      const red = E.io3(P(t, tp + 0.25 + i * 0.07, .5)), dim = (pn?.dim || []).includes(i);
      const tgt = dim ? s.cDim : s.cHL;
      b.material.color.copy(s.cBase[i]).lerp(tgt, pn ? red : 0); b.material.emissive.copy(s.cBase[i]).lerp(tgt, pn ? red : 0);
    });
    const m = E.io3(t / s.T.dur);
    s.g.position.set(0, -2.05, 0); s.g.rotation.y = lerp(0.07, -0.04, m);
    camLook(0, lerp(-0.7, 0.35, m), 11.9, 0, lerp(-1.1, -1.05, m), 0);
    s.post = () => s.towers.forEach((b, i) => {
      const p = new THREE.Vector3(); b.localToWorld(p.set(0, 1, 0)); proj(p, s.labels[i], 0, -6);
      const h = b.userData.hit; s.labels[i].style.opacity = C(E.o3(h * 3)) * C(b.userData.g * 2 - .6);
      s.labels[i].style.transform = `translate(-50%,-100%) scale(${lerp(1.35, 1, E.o3(h * 2.5))})`;
    });
  };
};

/* ---- gauge: dong xu 3D co ky hieu + dong ho % + the anh/thong tin ---- */
BUILDERS.gauge = (s, c) => {
  const r = s.root, pct = c.percent ?? 50;
  s.tag = headBlock(r, c.tag || '');
  s.t1 = bigText(r, 'h2', esc(c.title?.[0]), 'left:56px;top:230px;font-size:104px');
  s.t2 = bigText(r, 'h2 amb', esc(c.title?.[1]), 'left:58px;top:332px;font-size:104px');
  s.t3 = el(r, 'abs sub', esc(c.sub), 'left:60px;top:450px;right:60px');
  s.gauge = el(r, 'abs', `<svg width="560" height="300" viewBox="0 0 560 300">
      <path d="M40 280 A240 240 0 0 1 520 280" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="34" stroke-linecap="round"/>
      <path class="arc" d="M40 280 A240 240 0 0 1 520 280" fill="none" stroke="${ACC}" stroke-width="34" stroke-linecap="round" pathLength="100" stroke-dasharray="0 100"/></svg>
    <div style="position:absolute;left:0;right:0;top:150px;text-align:center"><div class="num" style="font:900 110px/1 var(--H);letter-spacing:-.04em">0%</div>
    <div style="font:600 25px/1.3 var(--B);color:#bdb7ac;margin-top:6px">${esc(c.percentLabel)}</div></div>`, 'left:260px;top:1000px;width:560px;height:320px');
  s.arc = s.gauge.querySelector('.arc'); s.num = s.gauge.querySelector('.num');
  const ph = c.photo, img = ph && asset(ph.img);
  s.photo = img ? el(r, 'abs card', `<div style="height:236px;border-radius:18px;overflow:hidden;background:url(${img}) center 20%/cover"></div>
      <div style="font:800 26px/1.1 var(--B);margin-top:12px">${esc(ph.name)}</div><div style="font:600 21px/1.2 var(--B);color:#bdb7ac;margin-top:4px">${esc(ph.role)}</div>
      <div style="font:500 15px/1.25 var(--M);color:#77736c;margin-top:8px">${esc(ph.credit)}</div>`, 'left:56px;top:548px;width:236px;padding:12px;border-radius:24px') : null;
  s.info = c.info ? el(r, 'abs card', `<div style="font:700 21px/1.2 var(--M);color:var(--amb);letter-spacing:.06em">${esc(c.info.kicker)}</div>
      <div style="font:700 27px/1.3 var(--B);margin-top:12px">${c.info.html || ''}</div><div style="font:600 22px/1.35 var(--B);color:#bdb7ac;margin-top:12px">${esc(c.info.note)}</div>`,
    'left:788px;top:560px;width:236px;padding:20px;border-radius:24px') : null;
  const nd = Math.max(2, Math.min(12, c.dots ?? 7));
  s.dots = []; for (let i = 0; i < nd; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 16), new THREE.MeshStandardMaterial({ color: HEX.ink, emissive: HEX.amb, emissiveIntensity: .35, roughness: .3 })); s.g.add(m); s.dots.push(m); }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nd * 6), 3));
  s.lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: HEX.amb, transparent: true, opacity: .5 })); s.g.add(s.lines);
  const coinTex = canvasTex(512, 512, (x, w, h) => {
    const g = x.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w / 2); g.addColorStop(0, '#ffcf7a'); g.addColorStop(1, '#c97f16'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(40,24,4,.55)'; x.lineWidth = 10; x.beginPath(); x.arc(w / 2, h / 2, w / 2 - 34, 0, Math.PI * 2); x.stroke();
    x.fillStyle = '#2a1904'; x.textAlign = 'center'; x.textBaseline = 'middle'; fitFont(x, esc(c.symbol || '★'), 900, '"Inter Tight"', 300, 330); x.fillText(esc(c.symbol || '★'), w / 2 + 4, h / 2 + 14);
  });
  coinTex.center.set(0.5, 0.5); coinTex.rotation = Math.PI / 2;
  s.coin = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.15, 96), [new THREE.MeshStandardMaterial({ color: 0xc9861e, metalness: .7, roughness: .3, emissive: 0x3a2204 }),
    new THREE.MeshStandardMaterial({ map: coinTex, metalness: .35, roughness: .35, emissive: 0x2a1604 }), new THREE.MeshStandardMaterial({ map: coinTex, metalness: .35, roughness: .35 })]);
  s.g.add(s.coin); s.gl = glow(HEX.amb, 4.5, .0); s.gl.position.set(0, 0, -0.5); s.g.add(s.gl);
  s.update = (t) => {
    const L = s.T.L[0], len = L.len;
    show(s.tag, E.o3(P(t, 0, .35)), 20); show(s.t1, E.o5(P(t, 0.05, .45)), 60); show(s.t2, E.o5(P(t, L.start + len * 0.42, .45)), 60); show(s.t3, E.o3(P(t, L.start + len * 0.2, .45)), 30);
    const conv = E.io3(P(t, L.start + len * 0.35, 1.0)), pos = s.lines.geometry.attributes.position;
    s.dots.forEach((d, i) => {
      const ap = E.oB(P(t, 0.1 + i * 0.08, .45)), a = i / nd * Math.PI * 2 + t * 0.6, R = 1.75;
      d.position.set(Math.cos(a) * R * (1 - conv), Math.sin(a) * R * (1 - conv), 0); d.scale.setScalar(Math.max(.001, ap * (1 - conv * .85)));
      pos.setXYZ(i * 2, d.position.x, d.position.y, d.position.z); pos.setXYZ(i * 2 + 1, 0, 0, 0);
    });
    pos.needsUpdate = true; s.lines.material.userData.op = .5 * C(P(t, .6, .4)) * (1 - conv);
    const cp = E.oB(P(t, L.start + len * 0.45, .6));
    s.coin.scale.setScalar(Math.max(.001, cp)); s.coin.visible = cp > .002;
    s.coin.rotation.set(Math.PI / 2 - 0.25, 0, 0); s.coin.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), (1 - cp) * 3 + Math.sin(t * 1.3) * 0.35);
    s.gl.material.userData.op = .45 * cp;
    const gp = E.io3(P(t, s.ev(c.percentAt, 0, .66), 1.1));
    show(s.gauge, E.o5(P(t, s.ev(c.percentAt, 0, .6), .45)), 40);
    s.arc.setAttribute('stroke-dasharray', `${pct * gp} 100`); s.num.textContent = fmt(pct * gp, pct % 1 ? 1 : 0) + '%';
    if (s.photo) show(s.photo, E.o5(P(t, 0.35, .5)), 0, -60);
    if (s.info) show(s.info, E.o5(P(t, L.start + len * 0.3, .5)), 0, 60);
    s.g.position.set(0, 0.95, 0); camLook(0, 0, 11, 0, 0.3, 0);
  };
};

/* ---- warning: loi canh bao do + cac trich dan go chu ---- */
BUILDERS.warning = (s, c) => {
  const r = s.root;
  s.tag = headBlock(r, c.tag || 'Cảnh báo', 'red');
  s.t1 = bigText(r, 'h2 red', esc(c.title?.[0]), 'left:56px;top:230px;font-size:120px');
  s.t2 = bigText(r, 'h2', esc(c.title?.[1]), 'left:58px;top:342px;font-size:120px');
  const Q = (c.quotes || []).slice(0, 3).map(q => typeof q === 'string' ? { text: q } : q);
  s.Q = Q;
  s.q = Q.map((q, i) => { const e = el(r, 'abs card', `<span style="font:800 40px/1.15 var(--B)"></span>`, `left:60px;right:60px;top:${1000 + i * 108}px;height:92px;display:flex;align-items:center;padding:0 30px;border-color:rgba(255,79,79,.3);border-left:6px solid var(--red);overflow:hidden;white-space:nowrap`); e.dataset.full = q.text; return e; });
  s.core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 1), new THREE.MeshBasicMaterial({ color: 0xff6a5a, wireframe: true, transparent: true, opacity: 1 }));
  s.inner = new THREE.Mesh(new THREE.IcosahedronGeometry(0.66, 1), new THREE.MeshStandardMaterial({ color: 0x3a0c0c, emissive: 0x7a1010, emissiveIntensity: .5, roughness: .35, metalness: .4, flatShading: true }));
  s.ring = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.012, 8, 160), new THREE.MeshBasicMaterial({ color: HEX.red, transparent: true, opacity: .6 }));
  s.g.add(s.core, s.inner, s.ring); const gl = glow(HEX.red, 5.5, .35); gl.position.z = -1; s.g.add(gl);
  s.gs = 0.86;
  s.update = (t) => {
    show(s.tag, E.o3(P(t, 0, .35)), 20); show(s.t1, E.o5(P(t, 0.05, .45)), 60); show(s.t2, E.o5(P(t, 0.18, .45)), 60);
    const def = [.3, .47, .68];
    s.q.forEach((e, i) => {
      const q0 = s.ev(s.Q[i], 0, def[i]), p = P(t, q0, .5); show(e, E.o5(P(t, q0, .3)), 0, -40);
      const full = e.dataset.full, n = Math.round(full.length * C(p * 1.6));
      e.firstChild.textContent = full.slice(0, n) + (p < .62 && p > 0 ? '▍' : '');
    });
    const gi = Math.floor(t * 14), glitch = hash(gi) > .86 ? 1 : 0;
    s.core.rotation.set(t * .35, t * .5, 0); s.inner.rotation.set(-t * .2, t * .3, 0);
    s.core.scale.setScalar(E.oB(P(t, 0, .7)) * (1 + Math.sin(t * 6) * 0.03 + glitch * (hash(gi + 5) - .5) * .15)); s.inner.scale.setScalar(E.o5(P(t, .1, .7)));
    s.core.position.x = glitch * (hash(gi + 9) - .5) * .25;
    s.ring.rotation.set(1.2, 0, t * .4); s.ring.scale.setScalar(E.o3(P(t, .2, .8)));
    s.inner.material.emissiveIntensity = .45 + Math.sin(t * 6) * .2 + glitch * .8;
    s.g.position.set(0, 1.25, 0); camLook(0, 0, 11, 0, 0.6, 0);
  };
};

/* ---- bignum: so rat lon + chong dong xu 3D + cac dong moc thoi gian ---- */
BUILDERS.bignum = (s, c) => {
  const r = s.root;
  s.tag = headBlock(r, c.tag || '');
  s.n1 = el(r, 'abs big amb fit', '', 'left:48px;top:226px;font-size:196px');
  s.u = el(r, 'abs h3', esc(c.unit), 'left:60px;top:410px;font-size:72px');
  const rows = (c.rows || []).slice(0, 3);
  s.tlc = rows.length ? el(r, 'abs card', rows.map((rw, i) => `${i ? '<div style="height:1px;background:var(--line);margin:0 32px"></div>' : ''}
      <div style="display:flex;gap:26px;align-items:flex-start;padding:24px 32px">
        <div style="font:700 26px/1.3 var(--M);color:${i === 0 ? 'var(--amb)' : 'var(--mute)'};width:230px;flex:none">${esc(rw.k)}</div>
        <div style="font:700 34px/1.2 var(--B)">${esc(rw.v)} <span class="mute" style="font-weight:600">${esc(rw.note || '')}</span></div></div>`).join(''), 'left:60px;right:60px;top:1085px') : null;
  s.coins = [];
  const cg = new THREE.CylinderGeometry(0.3, 0.3, 0.056, 64);
  const cmat = new THREE.MeshStandardMaterial({ color: 0xffc35a, metalness: .35, roughness: .3, emissive: 0x7a4a08, emissiveIntensity: .55 });
  const edgeM = new THREE.MeshStandardMaterial({ color: 0xe0962a, metalness: .4, roughness: .45, emissive: 0x5a3204, emissiveIntensity: .6 });
  [[-0.72, 8, 0.15], [0, 13, -0.15], [0.72, 19, 0.1]].forEach(([x, n, z], si) => {
    for (let i = 0; i < n; i++) { const m = new THREE.Mesh(cg, [edgeM, cmat, cmat]); m.userData = { si, i, x: x + (hash(si * 50 + i) - .5) * 0.05, z }; m.rotation.y = hash(i + si * 9) * 6; s.g.add(m); s.coins.push(m); }
  });
  const gl = glow(HEX.amb, 5, .3); gl.position.set(0.9, 1.2, -1); s.g.add(gl);
  s.update = (t) => {
    show(s.tag, E.o3(P(t, 0, .35)), 20);
    s.n1.textContent = esc(c.prefix || '') + fmt(lerp(0, c.value ?? 0, E.o3(P(t, 0.1, 1.4))), c.dec ?? 0) + esc(c.suffix || '');
    fit(s.n1); show(s.n1, E.o5(P(t, 0.0, .45)), 60); show(s.u, E.o5(P(t, 0.15, .45)), 40);
    if (s.tlc) show(s.tlc, E.o5(P(t, s.ev(c.rowsAt, 0, .5), .5)), 50);
    s.coins.forEach(m => {
      const { si, i, x, z } = m.userData, p = E.o3(P(t, 0.15 + si * 0.25 + i * 0.075, .35)), y = i * 0.058 + 0.03;
      m.position.set(x, lerp(y + 3.2, y, p), z); m.visible = p > 0.001; m.rotation.x = (1 - p) * 0.8;
    });
    s.g.position.set(0.3, -0.55, 0); s.g.rotation.y = -0.3 + t * .06;
    const m = E.io3(t / s.T.dur); camLook(0, lerp(0.45, 0.9, m), lerp(10.2, 10.8, m), 0, lerp(-0.3, -0.2, m), 0);
  };
};

/* ---- list: cac y chinh/buoc lam hien lan luot ---- */
BUILDERS.list = (s, c) => {
  const r = s.root, items = (c.items || []).slice(0, 4);
  s.tag = headBlock(r, c.tag || '');
  s.t1 = bigText(r, 'h2', esc(c.title?.[0]), 'left:56px;top:230px;font-size:104px');
  s.t2 = c.title?.[1] ? bigText(r, 'h2 amb', esc(c.title[1]), 'left:58px;top:332px;font-size:104px') : null;
  const top0 = c.title?.[1] ? 480 : 380, room = 1300 - top0, hh = Math.min(200, Math.floor(room / Math.max(1, items.length)));
  s.items = items.map((it, i) => el(r, 'abs card li', `<div class="n">${esc(it.n ?? (i + 1))}</div><div><div class="t">${esc(it.title)}</div>${it.desc ? `<div class="d">${esc(it.desc)}</div>` : ''}</div>`,
    `left:60px;right:60px;top:${top0 + i * hh}px;max-height:${hh - 14}px;overflow:hidden`));
  s.ico = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 1), new THREE.MeshBasicMaterial({ color: HEX.amb, wireframe: true, transparent: true, opacity: .16 }));
  s.knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.55, 0.16, 160, 20), new THREE.MeshStandardMaterial({ color: HEX.amb, emissive: HEX.amb, emissiveIntensity: .3, roughness: .35, metalness: .3, transparent: true, opacity: .4 }));
  s.g.add(s.ico, s.knot);
  s.update = (t) => {
    show(s.tag, E.o3(P(t, 0, .35)), 20); show(s.t1, E.o5(P(t, 0.05, .45)), 60); if (s.t2) show(s.t2, E.o5(P(t, 0.18, .45)), 60);
    s.items.forEach((e, i) => { const it = items[i]; const t0 = (it.word || it.line !== undefined || it.frac !== undefined) ? s.ev(it) : 0.5 + i * Math.max(.4, (s.T.dur - 1.2) / items.length); show(e, E.o5(P(t, t0, .45)), 0, -60); });
    s.ico.rotation.set(t * .15, t * .22, 0); s.knot.rotation.set(t * .4, t * .25, 0); s.knot.scale.setScalar(E.oB(P(t, .1, .8)));
    s.g.position.set(1.45, -0.85, -2.5); camLook(0, 0, 12, 0, 0, 0);
  };
};

/* ---- terminal: cua so lenh go tung dong (cong cu, repo GitHub) ---- */
BUILDERS.terminal = (s, c) => {
  const r = s.root, LN = (c.commands || []).slice(0, 6);
  s.tag = headBlock(r, c.tag || 'Terminal');
  s.t1 = bigText(r, 'h2', esc(c.title?.[0]), 'left:56px;top:230px;font-size:96px');
  s.t2 = c.title?.[1] ? bigText(r, 'h2 amb', esc(c.title[1]), 'left:58px;top:326px;font-size:96px') : null;
  s.box = el(r, 'abs card term', `<div class="bar"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i><span style="margin-left:14px">${esc(c.window || 'bash')}</span></div><div class="body"></div>`,
    `left:56px;right:56px;top:${c.title?.[1] ? 470 : 380}px;min-height:560px;max-height:820px;overflow:hidden;background:rgba(12,13,15,.94)`);
  s.body = s.box.querySelector('.body'); s.last = '';
  s.cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: HEX.amb, wireframe: true, transparent: true, opacity: .25 }));
  s.g.add(s.cube);
  s.update = (t) => {
    show(s.tag, E.o3(P(t, 0, .35)), 20); show(s.t1, E.o5(P(t, 0.05, .45)), 60); if (s.t2) show(s.t2, E.o5(P(t, 0.18, .45)), 60);
    show(s.box, E.o5(P(t, 0.25, .5)), 40);
    let html = '';
    LN.forEach((ln, i) => {
      const t0 = (ln.word || ln.line !== undefined || ln.frac !== undefined) ? s.ev(ln) : 0.6 + i * Math.max(.5, (s.T.dur - 1.5) / LN.length);
      const p = C((t - t0) / Math.max(.4, (ln.cmd || '').length * 0.035));
      if (t < t0) return;
      const cmd = esc(ln.cmd || ''), n = Math.round(cmd.length * p);
      html += `<div><span class="p">${esc(ln.p ?? '$')}</span> <span class="c">${cmd.slice(0, n).replace(/</g, '&lt;')}</span>${p < 1 ? '<span class="p">▍</span>' : ''}</div>`;
      if (p >= 1) (ln.out || []).forEach(o => { html += `<div class="o">${esc(o).replace(/</g, '&lt;')}</div>`; });
    });
    if (html !== s.last) { s.body.innerHTML = html; s.last = html; }
    s.cube.rotation.set(t * .3, t * .4, 0); s.g.position.set(1.5, -1.1, -3); camLook(0, 0, 12, 0, 0, 0);
  };
};

/* ---- cta: dien thoai cuon trang bai goc (anh chup man hinh) + duong dan ---- */
BUILDERS.cta = (s, c) => {
  const r = s.root;
  s.tag = headBlock(r, c.tag || 'Đọc thêm');
  s.t1 = bigText(r, 'h2', esc(c.title?.[0]), 'left:56px;top:230px;font-size:104px');
  s.t2 = bigText(r, 'h2 amb', esc(c.title?.[1]), 'left:58px;top:332px;font-size:92px');
  const shot = asset(c.screenshot);
  const fb = c.fallback || {};
  const screen = shot ? `<img src="${shot}" style="position:absolute;left:0;top:0;width:100%;display:block">`
    : `<div style="padding:48px 30px;color:#111"><div style="font:700 20px var(--M);color:#777">${esc(fb.kicker)}</div><div style="font:900 44px/1.08 var(--H);margin-top:18px;color:#111">${esc(fb.title)}</div></div>`;
  s.phone = el(r, 'abs', `<div style="position:absolute;left:14px;top:14px;right:14px;bottom:14px;border-radius:38px;overflow:hidden;background:#fff">${screen}</div>`,
    'left:320px;top:462px;width:440px;height:760px;border-radius:50px;background:#1a1b1e;border:2px solid rgba(255,255,255,.18);box-shadow:0 40px 120px rgba(0,0,0,.6),0 0 0 8px #0e0f11');
  s.img = s.phone.querySelector('img');
  s.url = el(r, 'abs chip', `<span class="amb">↗</span> ${esc(c.url)}`, 'left:0;right:0;margin:0 auto;width:max-content;max-width:960px;top:1240px;font-size:34px;padding:14px 28px');
  s.update = (t) => {
    show(s.tag, E.o3(P(t, 0, .35)), 20); show(s.t1, E.o5(P(t, 0.05, .45)), 60); show(s.t2, E.o5(P(t, 0.18, .45)), 60);
    const pp = E.o5(P(t, 0.1, .8)); s.phone.style.opacity = pp;
    s.phone.style.transform = `perspective(1600px) translateY(${(1 - pp) * 200}px) rotateX(${lerp(24, 8, pp)}deg) rotateY(${lerp(-26, -12, pp) + Math.sin(t) * 1.5}deg) rotateZ(${lerp(4, 2, pp)}deg)`;
    if (s.img && s.img.naturalHeight) { const max = Math.max(0, s.img.clientHeight - 732); s.img.style.transform = `translateY(${-Math.min(max, 1900) * E.io3(P(t, 1.3, Math.max(1.5, s.T.dur - 1.8)))}px)`; }
    show(s.url, E.oB(P(t, 0.9, .5)), 30, 0, .8);
    camLook(0, 0, 14, 0, 0, 0);
  };
};

/* ===================== dung tat ca canh ===================== */
SPEC.scenes.forEach((cfg, i) => SCENES.push(makeScene(cfg, i)));

/* ===================== vong render ===================== */
const capEl = $('#cap'), capSpan = capEl.firstChild, srcEl = $('#src'), progEl = $('#prog');
let lastCap = -1, lastSrc = '';
const toneOf = ln => { const L = TL.lines[ln - 1]; return L ? (L.tone || '') : ''; };
window.renderAt = (t) => {
  progEl.style.width = (C(t / TL.duration) * W) + 'px';
  let active = null;
  SCENES.forEach((s, idx) => {
    const isLast = idx === SCENES.length - 1;
    const on = t >= s.T.start && t < s.T.end + (isLast ? 1 : 0);
    s.post = null;
    if (!on) { s.root.style.opacity = 0; s.root.style.display = 'none'; s.g.visible = false; return; }
    active = s; const lt = t - s.T.start, d = s.T.dur;
    s.root.style.display = ''; s.update(lt);
    const out = isLast ? 1 : 1 - E.io3(P(lt, d - 0.2, 0.2)), inn = E.o3(P(lt, 0, 0.18));
    s.root.style.opacity = inn * out; s.root.style.transform = `translateY(${(1 - out) * -30}px)`;
    fade(s.g, E.o3(P(lt, 0, 0.3)) * out);
    s.g.scale.setScalar(lerp(0.92, 1, E.o3(P(lt, 0, .45))) * (s.gs || 1));
  });
  let ci = -1;
  for (let i = 0; i < TL.caps.length; i++) if (t >= TL.caps[i].start && t < TL.caps[i].end) { ci = i; break; }
  if (ci !== lastCap) { lastCap = ci; capSpan.innerHTML = ci >= 0 ? TL.caps[ci].html : ''; capEl.className = ci >= 0 ? toneOf(TL.caps[ci].line) : ''; }
  if (ci >= 0) { const p = E.o3(P(t, TL.caps[ci].start, .14)); capSpan.style.opacity = p; capSpan.style.display = 'inline-block'; capSpan.style.transform = `translateY(${(1 - p) * 16}px) scale(${lerp(.94, 1, p)})`; }
  else capSpan.style.opacity = 0;
  const src = active ? (active.cfg.src || '') : '';
  if (src !== lastSrc) { srcEl.textContent = src; lastSrc = src; }
  bgPts.rotation.y = t * 0.012; bgPts.rotation.x = Math.sin(t * .05) * .05; bgPts.position.y = -t * 0.02;
  scene.updateMatrixWorld(); camera.updateMatrixWorld();
  SCENES.forEach(s => { if (s.post && s.g.visible) s.post(); });
  renderer.render(scene, camera);
  return true;
};
// kiem tra bo cuc: tra ve cac phan tu chu bi tran ngang man hinh
window.qaCheck = () => {
  const bad = [];
  document.querySelectorAll('.scene .abs, .scene .card, #cap span').forEach(e => {
    const st = getComputedStyle(e); if (st.display === 'none' || +st.opacity < .5) return;
    const b = e.getBoundingClientRect(); if (b.width < 2) return;
    if (b.left < -4 || b.right > W + 4) bad.push({ text: (e.textContent || '').trim().slice(0, 60), left: Math.round(b.left), right: Math.round(b.right) });
  });
  return bad;
};
window.TL = TL; window.READY = true;
