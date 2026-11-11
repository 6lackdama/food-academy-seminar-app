/* Rendert das Video Bild für Bild mit Chromium (Playwright) und setzt es mit ffmpeg zusammen.
 *
 *   node tools/render.cjs                → out/seminare-2027-reel.mp4 (1080×1920, 30 fps, mit Stimme)
 *   node tools/render.cjs --stills 1,5.5 → out/stills/still-1.00.png … (Einzelbilder zum Prüfen)
 *   node tools/render.cjs --from 20 --to 30 → nur ein Ausschnitt (schnelle Vorschau)
 *   node tools/render.cjs --workers 4    → parallel rendern (Standard: 3)
 *   node tools/render.cjs --music track.mp3 → Musik unter die Stimme legen (wird leiser gemischt)
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'out');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.json': 'application/json' };

function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(res);
    }).listen(0, () => resolve(srv));
  });
}

async function openPage(browser, port) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') console.log('[Seite]', m.text()); });
  page.on('pageerror', (e) => console.log('[Seitenfehler]', e.message));
  await page.goto(`http://localhost:${port}/src/index.html?render`);
  await page.evaluate(() => window.__ready);
  return page;
}

async function renderRange(browser, port, from, to, fps, file) {
  const page = await openPage(browser, port);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-maxrate', '9M', '-bufsize', '18M', '-tune', 'grain', '-pix_fmt', 'yuv420p', file]);
  const done = new Promise((r, j) => ff.on('close', (c) => (c ? j(new Error('ffmpeg ' + c)) : r())));
  for (let f = from; f < to; f++) {
    await page.evaluate((t) => window.__seek(t), f / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await done;
  await page.close();
}

(async () => {
  const srv = await serve();
  const port = srv.address().port;
  const browser = await chromium.launch();
  fs.mkdirSync(OUT, { recursive: true });

  if (opt('stills')) {
    const dir = path.join(OUT, 'stills');
    fs.mkdirSync(dir, { recursive: true });
    const page = await openPage(browser, port);
    for (const t of opt('stills').split(',').map(Number)) {
      await page.evaluate((x) => window.__seek(x), t);
      const f = path.join(dir, `still-${t.toFixed(2)}.png`);
      await page.screenshot({ path: f });
      console.log(f);
    }
    await browser.close(); srv.close();
    return;
  }

  const probe = await openPage(browser, port);
  const { total, fps } = await probe.evaluate(() => ({ total: window.__total, fps: window.__fps }));
  await probe.close();
  const from = Math.round(+opt('from', 0) * fps);
  const to = Math.round(Math.min(+opt('to', total), total) * fps);
  const workers = +opt('workers', 3);
  const per = Math.ceil((to - from) / workers);
  console.log(`Rendere ${(to - from) / fps}s (${to - from} Bilder) mit ${workers} Workern …`);
  const t0 = Date.now();
  const parts = [];
  await Promise.all([...Array(workers)].map((_, i) => {
    const a = from + i * per; const b = Math.min(to, a + per);
    if (a >= b) return null;
    const f = path.join(OUT, `part-${i}.mp4`);
    parts.push(f);
    return renderRange(browser, port, a, b, fps, f);
  }));
  await browser.close(); srv.close();
  console.log(`Bilder fertig in ${((Date.now() - t0) / 1000).toFixed(0)} s`);

  const list = path.join(OUT, 'parts.txt');
  fs.writeFileSync(list, parts.sort().map((p) => `file '${p}'`).join('\n'));
  const name = opt('out', from === 0 && to === Math.round(total * fps) ? 'seminare-2027-reel.mp4' : 'ausschnitt.mp4');
  const music = opt('music');
  const ss = String(from / fps); const dur = String((to - from) / fps);
  const inputs = ['-f', 'concat', '-safe', '0', '-i', list, '-ss', ss, '-t', dur, '-i', path.join(OUT, 'voice.wav')];
  let audioMap = ['-map', '0:v', '-map', '1:a'];
  if (music) {
    inputs.push('-ss', ss, '-t', dur, '-i', path.resolve(music));
    audioMap = ['-filter_complex', '[2:a]volume=0.22,afade=t=out:st=' + (Math.max(0, +dur - 2.5)) + ':d=2.5[m];[1:a][m]amix=inputs=2:normalize=0:duration=first[a]', '-map', '0:v', '-map', '[a]'];
  }
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, ...audioMap, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', path.join(OUT, name)]);
  parts.forEach((p) => fs.unlinkSync(p)); fs.unlinkSync(list);
  console.log('Fertig:', path.join(OUT, name));
})();
