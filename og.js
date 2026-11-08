// Makes the 1200×630 share images (Facebook, Pinterest, texts) into src/og/. Run: node og.js
// Renders each card with the Edge or Chrome already installed; re-run it when you add a calculator or change a diagram.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { CALCS } = require('./src/formulas.js');
const { diagram } = require('./src/diagrams.js');

const browsers = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
];
const browser = browsers.find(b => fs.existsSync(b));
if (!browser) throw new Error('Edge or Chrome not found. Add its path to the browsers list in og.js.');

const OUT = path.join(__dirname, 'src', 'og');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-og-'));
fs.mkdirSync(OUT, { recursive: true });
const css = fs.readFileSync(path.join(__dirname, 'src', 'style.css'), 'utf8');
const logo = fs.readFileSync(path.join(__dirname, 'src', 'favicon.svg'), 'utf8');

const card = (title, sub, art) => `<!doctype html><html data-theme="dark"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&display=swap">
<style>${css}
html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
body { background: var(--steel-2); color: var(--on-steel); font-family: var(--head); }
.stripe { height: 16px; background: repeating-linear-gradient(-45deg, var(--hazard) 0 22px, #16181a 22px 44px); }
.row { display: flex; align-items: center; gap: 40px; height: 566px; padding: 0 60px; }
.text { flex: 1; }
.brand { display: flex; align-items: center; gap: 14px; font-size: 34px; font-weight: 700; text-transform: uppercase; }
.brand svg { width: 48px; height: 48px; } .brand b { color: var(--hot); }
h1 { font-size: ${title.length > 26 ? 62 : 76}px; line-height: 1.02; margin: 34px 0 18px; text-transform: uppercase; }
p { margin: 0; font-size: 30px; color: var(--hazard); text-transform: uppercase; letter-spacing: .05em; }
.art { flex: none; width: 500px; background: var(--thumb); border-radius: 10px; padding: 20px; }
.dg .lbl { font-size: 13px; }
</style></head><body><div class="stripe"></div><div class="row"><div class="text">
<div class="brand">${logo}<span>Material<b>Math</b></span></div><h1>${title}</h1><p>${sub}</p></div>
${art ? `<div class="art">${art}</div>` : ''}</div></body></html>`;

function shoot(name, html) {
  const file = path.join(tmp, name + '.html');
  fs.writeFileSync(file, html);
  const png = path.join(OUT, name + '.png');
  fs.rmSync(png, { force: true });
  // Edge's launcher can return before the screenshot is written, so each shot gets its own profile and we wait for the file below
  execFileSync(browser, ['--headless=new', `--user-data-dir=${path.join(tmp, 'p-' + name)}`, '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1200,630',
    '--virtual-time-budget=4000', `--screenshot=${png}`, 'file:///' + file.replace(/\\/g, '/')], { stdio: 'ignore' });
  const until = Date.now() + 20000;
  while (!(fs.existsSync(png) && fs.statSync(png).size > 0) && Date.now() < until) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
  if (!fs.existsSync(png)) throw new Error(`No image was written for ${name}`);
  console.log('  og/' + name + '.png');
}

shoot('home', card('How much material do you need?', `${CALCS.length} free calculators · feet &amp; inches`, diagram('concrete-calculator')));
for (const c of CALCS) shoot(c.slug, card(c.title, `Free calculator · ${c.prices ? 'with cost estimate' : 'feet &amp; inches'}`, diagram(c.slug)));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`Made ${CALCS.length + 1} share images in src/og/. Run node build.js to copy them into dist/.`);
