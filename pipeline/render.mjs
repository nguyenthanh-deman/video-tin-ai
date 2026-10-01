// Render video: node pipeline/render.mjs runs/<id> [--workers N] [--snap t1,t2,...]
// - Tu mo server tinh tai thu muc goc repo, mo engine bang Chromium headless (WebGL qua SwiftShader)
// - Chup tung khung hinh -> ffmpeg -> ghep voi work/mix.wav -> nen 2 luot <= ~19MB -> runs/<id>/video.mp4
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { findChrome } from './find_chrome.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const RUN = path.relative(ROOT, path.resolve(ROOT, args[0])).split(path.sep).join('/');
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const WORK = path.join(ROOT, RUN, 'work');
const TL = JSON.parse(fs.readFileSync(path.join(WORK, 'timeline.json'), 'utf8'));
const FPS = 30, NF = Math.round(TL.duration * FPS);

/* ---------- server tinh ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/engine/index.html?run=${encodeURIComponent(RUN)}`;

/* ---------- tim Chromium ---------- */
const exe = findChrome();
if (!exe) { console.error('LOI: khong tim thay Chromium. Chay: bash scripts/setup.sh'); process.exit(7); }
const launch = () => chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });

async function openPage(b) {
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.error('PAGEERR', e.message));
  await p.goto(URL0);
  await p.waitForFunction(() => window.READY === true, null, { timeout: 90000 });
  await p.evaluate(() => new Promise(r => { Promise.all([...document.images].map(i => i.complete ? 1 : new Promise(z => { i.onload = i.onerror = z; }))).then(r); }));
  return p;
}

/* ---------- che do chup kiem tra (QA) ---------- */
const snap = opt('--snap');
if (snap !== undefined) {
  const out = path.join(WORK, 'qa'); fs.mkdirSync(out, { recursive: true });
  for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f));
  const b = await launch(), p = await openPage(b);
  let ts = snap ? snap.split(',').map(Number) : TL.scenes.map((s, i) => i === TL.scenes.length - 1 ? s.end - 0.3 : Math.max(s.start + (s.end - s.start) * 0.5, s.end - 0.32));
  const report = [];
  for (let i = 0; i < ts.length; i++) {
    await p.evaluate(t => window.renderAt(t), ts[i]);
    await p.screenshot({ path: path.join(out, String(i).padStart(2, '0') + '.png') });
    const bad = await p.evaluate(() => window.qaCheck());
    if (bad.length) report.push({ t: +ts[i].toFixed(2), overflow: bad });
  }
  fs.writeFileSync(path.join(WORK, 'qa.json'), JSON.stringify(report, null, 1));
  await b.close(); server.close();
  const cols = Math.min(5, ts.length), rows = Math.ceil(ts.length / cols);
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '1', '-i', path.join(out, '%02d.png'), '-vf', `scale=432:768,tile=${cols}x${rows}:padding=12:color=0x111111`, '-frames:v', '1', '-q:v', '3', path.join(ROOT, RUN, 'qa.jpg')], { stdio: 'inherit' });
  console.log(`QA: ${ts.length} khung -> ${RUN}/qa.jpg | loi tran chu: ${report.length ? JSON.stringify(report) : 'khong'}`);
  process.exit(0);
}

/* ---------- render day du ---------- */
const NW = Math.max(1, Math.min(Number(opt('--workers', Math.min(4, os.cpus().length))), 6));
const chunk = Math.ceil(NF / NW);
console.log(`Render ${NF} khung (${TL.duration.toFixed(2)}s) bang ${NW} tien trinh, Chromium: ${exe}`);
const t0 = Date.now();
async function worker(w) {
  const A = w * chunk, B = Math.min(NF, A + chunk); if (A >= B) return null;
  const b = await launch(), p = await openPage(b);
  const seg = path.join(WORK, `seg${w}.mp4`);
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', String(FPS), seg], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = A; f < B; f++) {
    await p.evaluate(tt => window.renderAt(tt), f / FPS);
    const buf = await p.screenshot({ type: 'jpeg', quality: 94 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - A) % 300 === 0) console.log(`  [${w}] khung ${f}/${NF} - ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close();
  return seg;
}
const segs = (await Promise.all([...Array(NW).keys()].map(worker))).filter(Boolean);
server.close();
fs.writeFileSync(path.join(WORK, 'segs.txt'), segs.map(s => `file '${s}'`).join('\n'));
const full = path.join(WORK, 'full.mp4');
let r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(WORK, 'segs.txt'), '-i', path.join(WORK, 'mix.wav'),
  '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', full], { stdio: 'inherit' });
if (r.status) process.exit(r.status);
// nen 2 luot de file <= ~19MB (vua GitHub web va gioi han chep file)
const kbps = Math.max(1500, Math.min(5000, Math.floor((19 * 8 * 1024) / TL.duration) - 140));
const final = path.join(ROOT, RUN, 'video.mp4'), plog = path.join(WORK, 'p2');
spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', full, '-c:v', 'libx264', '-preset', 'slow', '-b:v', kbps + 'k', '-pass', '1', '-passlogfile', plog, '-an', '-f', 'null', '/dev/null'], { stdio: 'inherit' });
r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', full, '-c:v', 'libx264', '-preset', 'slow', '-b:v', kbps + 'k', '-maxrate', Math.round(kbps * 1.8) + 'k', '-bufsize', Math.round(kbps * 2.6) + 'k',
  '-pass', '2', '-passlogfile', plog, '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', final], { stdio: 'inherit' });
if (r.status) process.exit(r.status);
for (const s of segs) fs.unlinkSync(s);
console.log(`XONG: ${RUN}/video.mp4 | ${(fs.statSync(final).size / 1048576).toFixed(1)}MB | ${((Date.now() - t0) / 1000).toFixed(0)}s`);
