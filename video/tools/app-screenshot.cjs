/* Macht einen Screenshot der echten Seminar-App (Startseite) für das Handy-Mockup im Outro.
 * Aufruf (aus video/):  node tools/app-screenshot.cjs   → assets/img/app-screen.png (danach ggf. nach .webp wandeln)
 * Startet dafür kurz einen lokalen Server auf dem Repo-Hauptordner. */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff': 'font/woff', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0, async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await pg.goto(`http://localhost:${srv.address().port}/index.html`, { waitUntil: 'networkidle' });
  await pg.waitForTimeout(800);
  await pg.mouse.click(195, 500); // Splash überspringen
  await pg.waitForTimeout(2500);
  const out = path.join(__dirname, '..', 'assets', 'img', 'app-screen.png');
  await pg.screenshot({ path: out });
  console.log(out);
  await b.close(); srv.close();
});
