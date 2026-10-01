// In duong dan Chromium dung duoc (exit 1 neu khong co). Dung chung cho render.mjs / shot.mjs / setup.sh
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { chromium } from 'playwright';
export function findChrome() {
  const c = [process.env.CHROME_PATH];
  try { c.push(chromium.executablePath()); } catch (e) { }
  for (const base of [process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(os.homedir(), '.cache', 'ms-playwright'), '/root/.cache/ms-playwright', '/opt/pw-browsers'])
    try { for (const d of fs.readdirSync(base)) if (d.startsWith('chromium')) c.push(path.join(base, d, 'chrome-linux', 'chrome'), path.join(base, d, 'chrome-linux64', 'chrome'), path.join(base, d, 'chrome-headless-shell-linux64', 'chrome-headless-shell')); } catch (e) { }
  c.push('/opt/cft/chrome-headless-shell-linux64/chrome-headless-shell', '/opt/cft/chrome-linux64/chrome',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/opt/google/chrome/chrome');
  return c.find(p => p && fs.existsSync(p) && !p.startsWith('/snap'));
}
if (process.argv[1] && process.argv[1].endsWith('find_chrome.mjs')) {
  const p = findChrome(); if (p) { console.log(p); process.exit(0); } process.exit(1);
}
