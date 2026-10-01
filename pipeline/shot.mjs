// Chup man hinh trang web (giao dien dien thoai) cho cac muc spec.screenshots -> runs/<id>/assets/<key>.jpg
// node pipeline/shot.mjs runs/<id>
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { findChrome } from './find_chrome.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUN = path.resolve(ROOT, process.argv[2]);
const spec = JSON.parse(fs.readFileSync(path.join(RUN, 'spec.json'), 'utf8'));
const A = path.join(RUN, 'assets'); fs.mkdirSync(A, { recursive: true });
const mf = path.join(A, 'manifest.json');
const man = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf, 'utf8')) : {};
const list = spec.screenshots || [];
if (!list.length) { console.log('Khong co screenshots trong spec'); process.exit(0); }
const b = await chromium.launch({ executablePath: findChrome(), args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true, locale: 'vi-VN',
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36' });
for (const s of list) {
  const p = await ctx.newPage();
  try {
    await p.goto(s.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await p.waitForTimeout(3500);
    // bo qua hop thoai cookie pho bien neu co
    for (const sel of ['button:has-text("Accept")', 'button:has-text("I agree")', 'button:has-text("Đồng ý")', 'button:has-text("Chấp nhận")'])
      try { const e = p.locator(sel).first(); if (await e.isVisible({ timeout: 300 })) await e.click({ timeout: 800 }); } catch (e) { }
    const ph = await p.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0));
    const h = Math.max(915, Math.min(s.height || 4000, 6000, ph || 915));
    const file = `${s.key}.jpg`;
    await p.screenshot({ path: path.join(A, file), type: 'jpeg', quality: 88, fullPage: true, clip: { x: 0, y: 0, width: 412, height: h } });
    man[s.key] = file; console.log('Chup OK:', s.key, s.url);
  } catch (e) { console.log('Chup LOI (bo qua):', s.key, e.message.split('\n')[0]); }
  await p.close();
}
await b.close();
fs.writeFileSync(mf, JSON.stringify(man, null, 1));
