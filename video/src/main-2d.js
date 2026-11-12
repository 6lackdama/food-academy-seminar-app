/* Seminare 2027 – Motion-Graphic-Video (Instagram Reel, 1080×1920), Orange-Fresh-Style
 *
 * Eine pausierte GSAP-Timeline. Alle Zeitpunkte kommen aus src/timing.js (gemessen an der Sprachspur):
 * jede Szene, jede Karte und jeder Untertitel hängt an einem Satzteil ('line') aus src/script.json.
 * window.__seek(t) setzt das Bild auf Sekunde t (Rendern Bild für Bild).
 */
(() => {
  const T = window.TIMING;
  const A = '../assets/';
  const $ = (s, root = document) => root.querySelector(s);
  const stage = $('#stage');
  const cam = $('#cam');
  const tl = gsap.timeline({ paused: true });

  // ---------------------------------------------------------------- Hilfen
  const makeRng = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const rnd = makeRng(2027);
  const rr = (a, b) => a + (b - a) * rnd();
  const segs = Object.fromEntries(T.segments.map((s) => [s.id, s]));
  const line = (id, i) => segs[id].lines[i];
  const ls = (id, i) => line(id, i).s;
  const segsOf = (sc) => T.segments.filter((s) => s.scene === sc);

  function el(tag, cls, html, parent) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  }
  const css = (e, st) => (Object.assign(e.style, st), e);
  function img(src, cls, parent, style = {}) { const i = el('img', cls, null, parent); i.src = src; return css(i, style); }
  /** Text in Buchstaben (oder Wörter) zerlegen, Zeilenumbrüche (<br>) bleiben erhalten */
  function split(e, by = 'ch') {
    const parts = e.innerHTML.split(/<br\s*\/?>/i);
    e.innerHTML = parts.map((p) => {
      const txt = p.replace(/<[^>]+>/g, '');
      const units = by === 'ch' ? [...txt] : txt.split(/(\s+)/);
      return units.map((u) => (/^\s+$/.test(u) ? `<span class="${by} sp">&nbsp;</span>` : `<span class="${by}">${u}</span>`)).join('');
    }).join('<br>');
    return [...e.querySelectorAll('.' + by + ':not(.sp)')];
  }
  const heartPath = 'M50 86 L15 51 C3 39 9 15 30 15 C40 15 46 21 50 28 C54 21 60 15 70 15 C91 15 97 39 85 51 Z';
  const heartSVG = (on) => on
    ? `<svg viewBox="0 0 100 100"><path d="${heartPath}" fill="none" stroke="url(#hg)" stroke-width="13" stroke-linejoin="round"/></svg>`
    : `<svg viewBox="0 0 100 100"><path d="${heartPath}" fill="#bfc4c9" stroke="#bfc4c9" stroke-width="13" stroke-linejoin="round"/></svg>`;

  /** Steakboy-Sticker */
  const sticker = (name, parent, x, y, w, flip = false) => {
    const s = img(`${A}sb/${name}.webp`, 'sb', parent, { left: x + 'px', top: y + 'px', width: w + 'px' });
    if (flip) s.style.scale = '-1 1';
    return s;
  };
  /** federnder Auftritt */
  function popIn(t, at, opts = {}) {
    tl.fromTo(t, { scale: 0, rotation: opts.rot0 ?? -14, y: opts.y0 ?? 60, opacity: 1 },
      { scale: 1, rotation: opts.rot ?? 0, y: 0, duration: opts.dur ?? 0.65, ease: opts.ease ?? 'back.out(1.7)' }, at);
  }
  function popOut(t, at, dur = 0.32) { tl.to(t, { scale: 0, rotation: 12, duration: dur, ease: 'back.in(1.7)' }, at); }
  /** sanftes Schweben (für Sticker & Food) */
  function idle(t, from, to, amp = 12, rot = 2.5, period = 0.95) {
    const n = Math.floor((to - from) / period);
    if (n < 1) return;
    tl.fromTo(t, { y: 0, rotation: 0 }, { y: -amp, rotation: rot, duration: period, ease: 'sine.inOut', repeat: n - 1, yoyo: true, immediateRender: false }, from);
  }
  /** Wörter von unten aus einer Maske */
  function riseWords(e, at, stagger = 0.06) {
    const ws = split(e, 'wd');
    tl.fromTo(ws, { yPercent: 110, opacity: 0, rotation: 6 }, { yPercent: 0, opacity: 1, rotation: 0, duration: 0.55, stagger, ease: 'expo.out' }, at);
    return ws;
  }
  function popLetters(e, at, stagger = 0.035) {
    const cs = split(e, 'ch');
    tl.fromTo(cs, { yPercent: 70, scale: 0.4, opacity: 0 }, { yPercent: 0, scale: 1, opacity: 1, duration: 0.6, stagger, ease: 'back.out(2.2)' }, at);
    return cs;
  }
  /** Konfetti in Markenfarben */
  function confetti(parent, x, y, at, n = 36, spread = 520) {
    const cols = ['#FCE531', '#ffffff', '#1d1d1b', '#F8915F', '#FCE531'];
    for (let i = 0; i < n; i++) {
      const c = el('div', 'confetti', null, parent);
      css(c, { left: x + 'px', top: y + 'px', background: cols[i % cols.length], width: rr(14, 26) + 'px', height: rr(22, 38) + 'px' });
      const dx = rr(-spread, spread); const up = rr(-720, -260);
      tl.fromTo(c, { x: 0, y: 0, rotation: 0, opacity: 1, scale: rr(0.7, 1.2) }, { x: dx * 0.7, y: up, rotation: rr(-360, 360), duration: 0.55, ease: 'power2.out' }, at);
      tl.to(c, { x: dx, y: up + rr(700, 1100), rotation: `+=${rr(-540, 540)}`, duration: rr(1.1, 1.6), ease: 'power1.in' }, at + 0.55);
      tl.set(c, { opacity: 0 }, at + 2.3);
    }
  }
  function tag(parent, text, x, y, rot, at, out) {
    const g = el('div', 'tag', text, parent);
    css(g, x === 'right' ? { right: '40px', top: y + 'px', transformOrigin: '80% 50%' } : { left: x + 'px', top: y + 'px' });
    popIn(g, at, { rot, rot0: rot - 20, y0: 30, dur: 0.5, ease: 'back.out(2.4)' });
    if (out) popOut(g, out, 0.25);
    return g;
  }

  // ---------------------------------------------------------------- Szenenwechsel
  let current = null;
  function layer(cls = 'layer') { return el('div', cls, null, cam); }
  /** neue Ebene schiebt sich von rechts rein, alte nach links raus */
  function push(next, at) {
    tl.set(next, { display: 'block' }, at);
    tl.fromTo(next, { xPercent: 100 }, { xPercent: 0, duration: 0.7, ease: 'power3.inOut' }, at);
    if (current) {
      tl.to(current, { xPercent: -100, duration: 0.7, ease: 'power3.inOut' }, at);
      tl.set(current, { display: 'none' }, at + 0.72);
    }
    current = next;
  }
  /** weißes (oder dunkles) Sheet fährt von unten hoch */
  function sheetUp(sheet, at) {
    tl.set(sheet, { display: 'block' }, at);
    tl.fromTo(sheet, { yPercent: 100 }, { yPercent: 0, duration: 0.7, ease: 'expo.out' }, at);
    if (current) tl.set(current, { display: 'none' }, at + 0.7);
    current = sheet;
  }
  /** Sheet fährt nach oben raus und gibt die nächste Ebene frei */
  function sheetAway(sheet, next, at) {
    tl.set(next, { display: 'block', xPercent: 0 }, at);
    tl.to(sheet, { yPercent: -100, duration: 0.6, ease: 'power3.inOut' }, at);
    tl.set(sheet, { display: 'none' }, at + 0.62);
    current = next;
  }

  // ================================================================= BUILD
  function build() {
    stage.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" style="position:absolute"><defs><linearGradient id="hg" x1="0" x2="1"><stop offset="0" stop-color="#F6A21E"/><stop offset="1" stop-color="#FCE531"/></linearGradient></defs></svg>`);

    // ---------- durchgehender Hintergrund: weiche Lichtflecken, Herz, "27"
    const bg = $('#bg');
    [[-200, 120, 760, 'rgba(255,255,255,.16)'], [520, 1100, 900, 'rgba(255,214,120,.18)'], [300, -300, 640, 'rgba(226,88,42,.35)']].forEach(([x, y, s, c], i) => {
      const b = el('div', 'blob', null, bg);
      css(b, { left: x + 'px', top: y + 'px', width: s + 'px', height: s + 'px', background: `radial-gradient(circle, ${c} 0%, transparent 68%)` });
      tl.fromTo(b, { x: 0, y: 0 }, { x: [180, -220, 140][i], y: [260, -200, 320][i], duration: T.total, ease: 'sine.inOut' }, 0);
    });
    const bh = el('div', 'bg-heart', `<svg width="1500" height="1500" viewBox="0 0 100 100"><path d="${heartPath}" fill="none" stroke="#fff" stroke-opacity=".10" stroke-width="5" stroke-linejoin="round"/></svg>`, bg);
    css(bh, { left: '-210px', top: '260px' });
    tl.fromTo(bh, { rotation: -8, scale: 0.95 }, { rotation: 10, scale: 1.08, duration: T.total, ease: 'none' }, 0);
    const bn = el('div', 'bg-num', `<svg width="900" height="760" viewBox="0 0 900 760"><text x="0" y="700" style="font:900 820px Outfit" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="6">27</text></svg>`, bg);
    css(bn, { left: '330px', top: '1240px' });
    tl.fromTo(bn, { x: 0 }, { x: -160, duration: T.total, ease: 'none' }, 0);

    // ---------- Story-Leiste (7 Themen)
    const story = $('#story');
    const storyFills = [...Array(7)].map(() => el('div', 'fill', null, el('div', 'seg', null, story)));
    tl.fromTo(story, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 1.0);

    // ================================================== 1) INTRO
    {
      const s = layer(); css(s, { display: 'block' }); current = s;
      [['NEU', '#fff', 'var(--o)'], ['2027', 'var(--ink)', 'var(--y)'], ['FRESH', 'var(--y)', 'var(--ink)']].forEach(([t, bgc, fg], i) => {
        const f = el('div', 'flash', `<span>${t}</span>`, stage);
        css(f, { background: bgc, color: fg });
        tl.set(f, { visibility: 'visible' }, i * 0.3);
        tl.fromTo($('span', f), { scale: 1.35 }, { scale: 1, duration: 0.3, ease: 'expo.out' }, i * 0.3);
        tl.set(f, { visibility: 'hidden' }, (i + 1) * 0.3);
      });
      const t0 = 0.9;
      const logo = img(A + 'img/food-academy-fresh-logo.svg', 'abs logo', s);
      const ring = el('div', 'abs', `<svg width="760" height="760" viewBox="0 0 760 760"><circle cx="380" cy="380" r="360" fill="rgba(255,255,255,.14)"/><circle cx="380" cy="380" r="372" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="5" stroke-dasharray="16 22"/></svg>`, s);
      css(ring, { left: '160px', top: '420px' });
      const sb = sticker('winken', s, 270, 430, 540);
      const hey = el('div', 'abs marker', 'HEY LEUTE!', s);
      css(hey, { left: '60px', top: '330px', fontSize: '150px', color: 'var(--y)', textShadow: '0 10px 0 rgba(120,35,0,.25)', zIndex: 6 });
      const np = el('div', 'abs nameplate', '<div class="n">FRANZ</div><br><div class="r">FRESH-TRAINER</div>', s);
      css(np, { zIndex: 6 });
      tl.fromTo(logo, { y: -80, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }, t0);
      tl.fromTo(ring, { scale: 0, rotation: -60 }, { scale: 1, rotation: 0, duration: 0.8, ease: 'expo.out' }, t0);
      tl.to(ring, { rotation: 45, duration: 4, ease: 'none' }, t0 + 0.8);
      popIn(sb, t0 + 0.05, { y0: 300, dur: 0.75 });
      tl.to(sb, { rotation: -6, duration: 0.22, yoyo: true, repeat: 5, ease: 'sine.inOut', transformOrigin: '50% 90%' }, ls('s01', 0));
      idle(sb, ls('s01', 0) + 1.4, segs.s02.start - 0.3);
      popIn(hey, ls('s01', 0) - 0.05, { rot: -7, rot0: -30, y0: 40, dur: 0.5, ease: 'back.out(2.2)' });
      tl.fromTo($('.n', np), { xPercent: -110 }, { xPercent: 0, duration: 0.55, ease: 'expo.out' }, ls('s01', 1) - 0.1);
      tl.fromTo($('.r', np), { xPercent: -140 }, { xPercent: 0, duration: 0.55, ease: 'expo.out' }, ls('s01', 2) - 0.1);
    }

    // ================================================== 2) COVER – Seminare 2027 sind da
    {
      const s = layer();
      const card = el('div', 'cover-card', `<img src="${A}pages/cover.webp">`, s);
      const yr = el('div', 'abs marker', '2027', s);
      css(yr, { left: '110px', top: '195px', fontSize: '170px', color: 'var(--y)', textShadow: '0 10px 0 rgba(120,35,0,.25)', zIndex: 6 });
      const fdf = el('div', 'abs cx', '<span class="pill" style="background:#fff;color:var(--o);font-size:58px;padding:20px 40px 15px">FÜR DIE FRISCHETHEKE</span>', s);
      css(fdf, { top: '985px', zIndex: 6 });
      const sb = sticker('party', s, 720, 1075, 300);
      push(s, segs.s02.start - 0.4);
      tl.fromTo(card, { y: 900, rotation: 18, rotationY: -50, transformPerspective: 1800 }, { y: 0, rotation: -3, rotationY: 0, duration: 0.85, ease: 'expo.out' }, ls('s02', 0) - 0.15);
      tl.to(card, { rotation: 2, y: -14, duration: 1.4, ease: 'sine.inOut', yoyo: true, repeat: 1 }, ls('s02', 0) + 0.8);
      popIn(yr, ls('s02', 0) + 0.45, { rot: -8, rot0: -30, dur: 0.55, ease: 'back.out(2.4)' });
      tl.fromTo(fdf, { yPercent: 160, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.55, ease: 'expo.out' }, ls('s02', 1) - 0.1);
      const tDa = ls('s02', 2);
      const da = el('div', 'abs stamp', 'SIND DA!', s); css(da, { left: '80px', top: '1170px' });
      popIn(da, tDa - 0.05, { rot: -7, rot0: -30, y0: 40, dur: 0.5, ease: 'back.out(2.6)' });
      popIn(sb, tDa - 0.1, { y0: 200, dur: 0.6 });
      confetti(s, 540, 700, tDa, 44);
      tl.fromTo(card, { scale: 1 }, { scale: 1.06, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out', immediateRender: false }, tDa);
    }

    // ================================================== 3) MENSCHEN – also: du!
    {
      const s = layer();
      const box = el('div', 'abs cx', null, s); css(box, { top: '430px' });
      const l1 = el('div', 'title-xl shadow-txt', 'MENSCHEN', box); css(l1, { fontSize: '178px' });
      const l2 = el('div', '', 'MACHEN DEN', box); css(l2, { font: '900 88px/1.1 Outfit', color: 'var(--ink)', marginTop: '10px' });
      const l3 = el('div', 'title-xl shadow-txt', 'UNTERSCHIED', box); css(l3, { fontSize: '138px' });
      const heart = el('div', 'abs', `<svg width="900" height="900" viewBox="0 0 100 100"><path d="${heartPath}" fill="none" stroke="#FCE531" stroke-width="8" stroke-linejoin="round" pathLength="1" stroke-dasharray="1 1"/></svg>`, s);
      css(heart, { left: '90px', top: '300px' });
      const du = el('div', 'abs cx title-xl shadow-txt', 'DU!', s); css(du, { top: '510px', fontSize: '400px' });
      const sb = sticker('zeigt', s, 30, 900, 400);
      push(s, segs.s03.start - 0.4);
      popLetters(l1, ls('s03', 0) - 0.05, 0.03);
      riseWords(l2, ls('s03', 1) - 0.05);
      popLetters(l3, ls('s03', 1) + 0.25, 0.025);
      const tDu = ls('s03', 2);
      tl.to(box, { y: -230, scale: 0.55, opacity: 0.25, duration: 0.5, ease: 'power3.inOut' }, tDu - 0.2);
      tl.fromTo($('path', heart), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.inOut' }, tDu);
      tl.fromTo(du, { scale: 0, rotation: -10 }, { scale: 1, rotation: 0, duration: 0.6, ease: 'back.out(2.2)' }, tDu + 0.1);
      popIn(sb, tDu + 0.25, { y0: 200 });
      tl.to(sb, { x: 30, duration: 0.25, yoyo: true, repeat: 3, ease: 'sine.inOut' }, tDu + 0.9);
    }

    // ================================================== 4) LEVEL
    {
      const s = layer();
      const title = el('div', 'abs cx title-xl shadow-txt', 'VIER LEVEL', s); css(title, { top: '175px', fontSize: '150px' });
      const xp = el('div', 'abs xp', '<div class="xp-l">XP</div><div class="xp-bar"><div class="xp-fill"></div></div>', s);
      const fill = $('.xp-fill', xp);
      const names = ['FRESH-LING', 'FRESH-KRAFT', 'FRESH-ALIST', 'FRESH-MASTER'];
      const rows = names.map((n, i) => {
        const r = el('div', 'lvl', `<div class="hearts">${[0, 1, 2, 3].map((k) => heartSVG(k <= i)).join('')}</div><div class="lbl">${n}</div>`, s);
        return css(r, { left: 0, top: 1130 - i * 182 + 'px', width: 470 + i * 150 + 'px' });
      });
      const up = el('div', 'abs marker', 'LEVEL UP!', s);
      css(up, { left: '90px', top: '405px', fontSize: '120px', color: 'var(--y)', textShadow: '0 10px 0 rgba(120,35,0,.3)', zIndex: 7 });
      const sbThink = sticker('denkt', s, 740, 980, 300);
      const sbDance = sticker('tanzen', s, 710, 960, 330);
      const sbGo = sticker('idee', s, 310, 540, 460);
      const kurz = el('div', 'abs cx title-xl shadow-txt', 'ICH ERKLÄR\'S<br>EUCH KURZ!', s); css(kurz, { top: '220px', fontSize: '128px' });
      push(s, segs.s04.start - 0.4);
      popLetters(title, ls('s04', 0) - 0.1, 0.03);
      tl.fromTo(xp, { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: 'expo.out' }, ls('s04', 0) + 0.2);
      popIn(sbThink, ls('s04', 0) + 0.2);
      rows.forEach((r, i) => {
        const t = ls('s04', i + 1) - 0.12;
        tl.fromTo(r, { xPercent: -105 }, { xPercent: 0, duration: 0.6, ease: 'expo.out' }, t);
        tl.fromTo(r.querySelectorAll('svg'), { scale: 0 }, { scale: 1, duration: 0.4, stagger: 0.06, ease: 'back.out(2.6)' }, t + 0.2);
        tl.to(fill, { width: (i + 1) * 25 + '%', duration: 0.45, ease: 'power2.out' }, t + 0.15);
      });
      const tUp = ls('s05', 2);
      popOut(sbThink, tUp - 0.15, 0.25);
      popIn(sbDance, tUp + 0.05);
      idle(sbDance, tUp + 0.7, ls('s05', 3) - 0.2, 14, 4, 0.45);
      popIn(up, tUp, { rot: -8, rot0: -30, y0: 30, dur: 0.5, ease: 'back.out(2.6)' });
      tl.to(rows[3], { scale: 1.05, transformOrigin: 'left center', duration: 0.25, yoyo: true, repeat: 3, ease: 'sine.inOut' }, tUp);
      confetti(s, 540, 760, tUp + 0.05, 30);
      // "Ich erklär's euch kurz." – alles raus, Steakboy mit Finger hoch
      const tK = ls('s05', 3) - 0.1;
      tl.to(rows, { xPercent: -110, duration: 0.45, stagger: 0.04, ease: 'power3.in' }, tK - 0.1);
      tl.to([title, xp, up], { opacity: 0, y: -60, duration: 0.35, ease: 'power2.in' }, tK - 0.1);
      popOut(sbDance, tK - 0.1, 0.25);
      riseWords(kurz, tK + 0.08, 0.12);
      popIn(sbGo, tK + 0.2, { y0: 300 });
    }

    // ================================================== 5–11) THEMEN
    const CATS = [
      { scene: 'onboarding', q: ['WAS GIBT\'S FÜR DEN', 'START'], name: 'ONBOARDING', sub: '& GRUNDLAGEN', qsb: 'schulterzucken', sb: 'fingerpistole',
        food: ['img/petersilie', 'food/p05_308'], tags: {} },
      { scene: 'fleisch', q: ['WAS GIBT\'S RUND UM', 'FLEISCH'], name: 'FLEISCH', qsb: 'grill', sb: 'grill2',
        food: ['food/p05_364', 'food/p17_1098'], tags: { 3: 'MEHR WEISS NUR OMA!', 4: 'FÜR ECHTE PROFIS' } },
      { scene: 'wurst', q: ['UND BEI', 'WURST'], name: 'WURST', qsb: 'koch-loeffel', sb: 'koch',
        food: ['food/p20_1257', 'food/p03_145'], tags: { 1: 'AUS ALLER WELT 🌍' } },
      { scene: 'kaese', q: ['WAS GEHT BEIM', 'KÄSE'], name: 'KÄSE', qsb: 'verliebt', sb: 'klatschen',
        food: ['food/p24_1408', 'food/p21_1277'], tags: { 3: 'HIGH END 💎' } },
      { scene: 'fisch', q: ['WAS GIBT\'S RUND UM', 'FISCH'], name: 'FISCH', qsb: 'schock', sb: 'achtung',
        food: ['food/p26_1450', 'food/p38_1906'], tags: { 2: 'AB NACH BREMERHAVEN!' } },
      { scene: 'fuehrung', q: ['IHR WOLLT', 'FÜHREN'], name: 'FÜHRUNG', sub: '& MANAGEMENT', qsb: 'stark', sb: 'daumen',
        food: ['food/p29_1556'], tags: { 4: 'IN NUR 5 TAGEN! ⚡' } },
      { scene: 'azubis', q: ['UND IHR', 'AZUBIS'], name: 'AUSBILDUNG', sub: '& WEITERBILDUNG', qsb: 'verlegen', sb: 'winken2', swap: [4, 'party2'], pages: true,
        food: [], tags: { 4: 'GEHT\'S LOS! 🚀' } },
    ];
    const OPAQUE = ['24', '29', '30', '31'];

    CATS.forEach((c, ci) => {
      const [qs, as] = segsOf(c.scene);
      const nextFirst = T.segments[T.segments.indexOf(as) + 1];
      const end = Math.max(as.end + 0.25, nextFirst.start - 0.45); // Ende der Antwort-Szene (nächster Übergang)

      // ---- Antwort-Ebene (Orange) – liegt bereit, das Sheet gibt sie frei
      const a = layer();
      const label = el('div', 'abs cat-label', `<span class="pill" style="background:#fff;color:var(--o)">THEMA ${ci + 1}/7</span>`, a);
      const nm = el('div', 'abs cat-name shadow-txt', c.name, a);
      const fs = Math.min(205, Math.floor(950 / (c.name.length * 0.68)));
      css(nm, { fontSize: fs + 'px' });
      let sub = null;
      if (c.sub) { sub = el('div', 'abs cat-sub', c.sub, a); css(sub, { top: 228 + fs * 0.98 + 'px' }); }
      const foods = c.food.map((f, i) => img(`${A}${f}.webp`, 'food', a, i === 0
        ? { left: '-70px', top: '1010px', width: '360px' } : { left: '800px', top: '400px', width: '280px' }));
      const sb = sticker(c.sb, a, 760, 1000, 290);

      // ---- Frage-Sheet (Weiß)
      const q = layer('sheet');
      const qlab = el('div', 'abs cx q-label', `<span class="pill" style="background:var(--o);color:#fff">THEMA ${ci + 1}/7</span>`, q);
      const q1 = el('div', 'abs cx q1', c.q[0], q);
      const q2 = el('div', 'abs cx q2', `<span class="kw">${c.q[1]}</span><span class="qm">?</span>`, q);
      css(q2, { fontSize: Math.min(250, Math.floor(920 / ((c.q[1].length + 0.6) * 0.68))) + 'px' });
      const qfood = c.food.slice(0, 2).map((f, i) => img(`${A}${f}.webp`, 'food', q, i === 0
        ? { left: '-40px', top: '880px', width: '360px' } : { left: '760px', top: '820px', width: '300px' }));
      const qsb = sticker(c.qsb, q, 310, 740, 460);

      // ---- Ablauf
      const prevSeg = T.segments[T.segments.indexOf(qs) - 1];
      const tQ = Math.max(prevSeg.end + 0.25, qs.start - 0.45);
      sheetUp(q, tQ);
      popIn($('.pill', qlab), tQ + 0.25, { rot0: -10, y0: 20, dur: 0.45, ease: 'back.out(2.4)' });
      riseWords(q1, qs.lines[0].s - 0.15, 0.05);
      const kw = $('.kw', q2);
      popLetters(kw, qs.lines[0].s + 0.05, 0.04);
      tl.fromTo($('.qm', q2), { scale: 0, rotation: -60 }, { scale: 1, rotation: 12, duration: 0.5, ease: 'back.out(3)' }, qs.lines[0].s + 0.3);
      popIn(qsb, tQ + 0.35, { y0: 320, dur: 0.7 });
      idle(qsb, tQ + 1.1, as.start - 0.4, 12, 3);
      qfood.forEach((f, i) => {
        tl.fromTo(f, { scale: 0, rotation: i ? 25 : -25 }, { scale: 1, rotation: 0, duration: 0.6, ease: 'back.out(1.6)' }, tQ + 0.45 + i * 0.1);
        tl.to(f, { rotation: i ? -6 : 6, y: -16, duration: Math.max(0.5, as.start - tQ - 1.2), ease: 'sine.inOut' }, tQ + 1.05);
      });

      const tA = as.start - 0.35;
      sheetAway(q, a, tA);
      tl.fromTo(storyFills[ci], { scaleX: 0 }, { scaleX: 1, duration: end - tQ, ease: 'none' }, tQ);
      popIn($('.pill', label), tA + 0.2, { rot0: -10, y0: 20, dur: 0.45, ease: 'back.out(2.4)' });
      popLetters(nm, tA + 0.2, 0.03);
      if (sub) tl.fromTo(sub, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.5, ease: 'power3.out' }, tA + 0.45);
      foods.forEach((f, i) => {
        tl.fromTo(f, { scale: 0, rotation: i ? 30 : -30 }, { scale: 1, rotation: 0, duration: 0.7, ease: 'back.out(1.5)' }, tA + 0.35 + i * 0.12);
        tl.to(f, { rotation: i ? 7 : -7, y: i ? 20 : -20, duration: Math.max(0.5, end - tA - 1.2), ease: 'sine.inOut' }, tA + 1.05);
      });
      popIn(sb, tA + 0.55, { y0: 260 });
      const tSwap = c.swap ? as.lines[c.swap[0]].s - 0.12 : null;
      idle(sb, tA + 1.25, (tSwap ?? end) - 0.1, 10, 2.5);
      if (c.swap) {
        const sb2 = sticker(c.swap[1], a, 730, 985, 320);
        popOut(sb, tSwap, 0.25);
        popIn(sb2, tSwap + 0.12, { y0: 200, dur: 0.55 });
        idle(sb2, tSwap + 0.7, end - 0.1, 14, 4, 0.45);
      }

      // Karten: genau eine Karte pro genanntem Seminar – wischt rein, wenn Franz sie nennt
      const cardLines = as.lines.map((l, i) => ({ l, i })).filter((x) => x.l.card);
      const cards = cardLines.map(({ l }) => {
        const k = el('div', `card ${c.pages ? 'page' : ''} ${OPAQUE.includes(l.card) ? 'opaque' : ''}`, null, a);
        img(A + (c.pages ? `pages/${l.card}.webp` : `titles/${l.card}.webp`), '', k);
        el('div', 'nr', l.card, k);
        return k;
      });
      cards.forEach((k, j) => {
        const tIn = cardLines[j].l.s - 0.12;
        const rot = j % 2 ? 2.2 : -2.2;
        tl.set(k, { visibility: 'visible' }, tIn - 0.01);
        if (j === 0) tl.fromTo(k, { yPercent: 70, scale: 0.75, rotation: -8, opacity: 0 }, { yPercent: 0, scale: 1, rotation: rot, opacity: 1, duration: 0.7, ease: 'expo.out' }, tIn);
        else tl.fromTo(k, { xPercent: 115, rotation: 12, scale: 0.92 }, { xPercent: 0, rotation: rot, scale: 1, duration: 0.65, ease: 'expo.out' }, tIn);
        const next = cards[j + 1];
        if (next) tl.to(k, { xPercent: -125, rotation: -14, scale: 0.9, duration: 0.5, ease: 'power3.in' }, cardLines[j + 1].l.s - 0.32);
        else tl.to(k, { scale: 1.03, duration: 0.25, yoyo: true, repeat: 1, ease: 'sine.inOut' }, tIn + 0.7);
      });
    });

    // ================================================== 12) FRESH DIGITAL (dunkles Sheet)
    {
      const [qs, as] = segsOf('digital');
      const d = layer('sheet dark');
      const q1 = el('div', 'abs cx q1', 'UND', d); css(q1, { top: '330px' });
      const q2 = el('div', 'abs cx q2', '<span class="kw">ZWISCHEN-<br>DURCH</span><span class="qm">?</span>', d);
      css(q2, { fontSize: '160px', top: '420px' });
      const zz = sticker('schlafen2', d, 300, 800, 480);
      const wake = sticker('achtung2', d, 800, 1150, 250);
      const logo = img(A + 'img/fresh-digital.webp', 'abs', d, { left: '150px', top: '150px', width: '780px', zIndex: 3 });
      const tiles = [
        `<img class="art" src="${A}img/100-handgriffe.webp"><div><div class="big"><span class="cnt">0</span></div><div class="t1">HANDGRIFFE</div><div class="t2">als Videos – kurz &amp; direkt aus der Praxis</div></div>`,
        `<img class="art" src="${A}img/edeka-nx.webp" style="height:150px;border-radius:24px"><div><div class="t1">BLENDED<br>LEARNING</div><div class="t2">Wissen, das zu dir passt</div></div>`,
        `<div class="wizz">Wizz<br>Up!</div><div><div class="t1">QUIZ-DUELL</div><div class="t2">Lernen. Spielen.<br>Wissen pushen!</div></div>`,
      ].map((h, i) => css(el('div', 'tile', h, d), { top: 560 + i * 262 + 'px' }));
      const cnt = $('.cnt', tiles[0]);

      const tQ = Math.max(T.segments[T.segments.indexOf(qs) - 1].end + 0.25, qs.start - 0.45);
      sheetUp(d, tQ);
      riseWords(q1, qs.lines[0].s - 0.15);
      popLetters($('.kw', q2), qs.lines[0].s + 0.05, 0.03);
      tl.fromTo($('.qm', q2), { scale: 0, rotation: -60 }, { scale: 1, rotation: 12, duration: 0.5, ease: 'back.out(3)' }, qs.lines[0].s + 0.4);
      popIn(zz, tQ + 0.35, { y0: 320, dur: 0.7 });
      tl.fromTo(zz, { y: 0 }, { y: 10, duration: 0.8, yoyo: true, repeat: 2, ease: 'sine.inOut', immediateRender: false }, tQ + 1.05);
      const tA = as.start - 0.3;
      tl.to([q1, q2], { y: -120, opacity: 0, duration: 0.4, ease: 'power3.in' }, tA - 0.1);
      popOut(zz, tA - 0.1, 0.35);
      tl.fromTo(logo, { scale: 2.2, opacity: 0, rotation: -6 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.6, ease: 'expo.out' }, tA + 0.1);
      as.lines.forEach((l, i) => {
        tl.fromTo(tiles[i], { xPercent: i % 2 ? 110 : -110, rotation: i % 2 ? 6 : -6 }, { xPercent: 0, rotation: 0, duration: 0.65, ease: 'expo.out' }, Math.max(tA + 0.2, l.s - 0.15));
      });
      popIn(wake, as.lines[0].s + 0.3, { y0: 200 });
      idle(wake, as.lines[0].s + 1.0, as.end + 0.4, 10, 3);
      const o = { v: 0 };
      tl.to(o, { v: 100, duration: 0.9, ease: 'power2.out', onUpdate: () => { cnt.textContent = Math.round(o.v); } }, as.lines[0].s);
      tl.fromTo($('.wizz', tiles[2]), { scale: 0.4, rotation: -25 }, { scale: 1, rotation: -4, duration: 0.55, ease: 'back.out(2.6)' }, as.lines[2].s + 0.1);
    }

    // ================================================== 13) SHARE – Bock drauf?
    {
      const s = layer();
      const bock = el('div', 'abs cx title-xl shadow-txt', 'BOCK<br>DRAUF?', s); css(bock, { top: '300px', fontSize: '220px' });
      const l1 = el('div', 'abs cx', 'SCHICK DAS DEINER', s); css(l1, { top: '880px', font: '900 70px/1 Outfit', color: 'var(--ink)' });
      const l2 = el('div', 'abs cx', '<span class="pill" style="background:#fff;color:var(--o);font-size:104px;padding:22px 40px 16px;border-radius:30px">MARKTLEITUNG!</span>', s);
      css(l2, { top: '970px' });
      const trail = el('div', 'abs', `<svg width="1080" height="1920"><path d="M-40 1300 C 260 1230, 330 1180, 560 1210 S 900 1100, 1130 860" fill="none" stroke="#fff" stroke-width="9" stroke-dasharray="4 26" stroke-linecap="round" stroke-opacity=".8"/></svg>`, s);
      css(trail, { left: 0, top: 0 });
      const plane = el('div', 'abs', `<svg viewBox="0 0 100 100" width="170" height="170"><path d="M8 46 L92 10 L66 90 L50 58 Z" fill="#fff" stroke="#fff" stroke-width="5" stroke-linejoin="round"/><path d="M50 58 L92 10" stroke="#F3703A" stroke-width="6"/></svg>`, s);
      css(plane, { left: '-190px', top: '1210px', zIndex: 6 });
      const sb = sticker('tanzen', s, 800, 110, 240);
      push(s, segs.s22.start - 0.4);
      popLetters(bock, ls('s22', 0) - 0.1, 0.035);
      popIn(sb, ls('s22', 0) + 0.15, { y0: 250 });
      idle(sb, ls('s22', 0) + 0.85, ls('s22', 1) + 1.6, 16, 5, 0.42);
      const tS = ls('s22', 1);
      tl.to(bock, { scale: 0.7, y: -120, duration: 0.45, ease: 'power3.inOut' }, tS - 0.25);
      riseWords(l1, tS - 0.1);
      tl.fromTo($('.pill', l2), { scale: 0, rotation: -8 }, { scale: 1, rotation: -3, duration: 0.55, ease: 'back.out(2.2)' }, tS + 0.35);
      tl.fromTo(trail, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1.2, ease: 'power2.inOut' }, tS + 0.1);
      tl.fromTo(plane, { x: 0, y: 0, rotation: 8 }, { x: 1360, y: -420, rotation: -18, duration: 1.2, ease: 'power2.inOut' }, tS + 0.1);
    }

    // ================================================== 14) BROSCHÜRE – Alle Details? + Endcard
    {
      const s = layer();
      const seg = segs.s23;
      const head = el('div', 'abs cx title-xl shadow-txt', 'ALLE DETAILS?', s); css(head, { top: '200px', fontSize: '128px' });
      const fan = el('div', 'abs', null, s); css(fan, { inset: 0 });
      const FAN = ['06', '17', '21', '28', '31', '39', '11'];
      const pages = FAN.map((n) => el('div', 'fan-page', `<img src="${A}pages/fan-${n}.webp">`, fan));
      const cover = el('div', 'fan-page cover', `<img src="${A}pages/cover.webp">`, fan);
      const sbD = sticker('denkt2', s, 730, 980, 300);
      const sbP = sticker('praesentiert', s, -10, 960, 360);
      const bro = el('div', 'tag', 'AB IN DIE BROSCHÜRE!', s); css(bro, { left: '330px', top: '1110px', fontSize: '66px' });
      const end = el('div', 'abs endcard', `<img src="${A}img/food-academy-fresh-logo.svg"><div style="margin-top:34px"><span class="pill" style="background:#fff;color:var(--o);font-size:54px">SEMINARE 2027</span></div><div class="see">WIR SEHEN UNS<br>AN DER THEKE!</div>`, s);
      const sbW = sticker('winken2', s, 330, 1030, 420);
      push(s, seg.start - 0.4);
      popLetters(head, ls('s23', 0) - 0.1, 0.03);
      popIn(sbD, ls('s23', 0) + 0.1, { y0: 250 });
      const tB = ls('s23', 1);
      tl.fromTo([...pages, cover], { y: 1300, rotation: 15 }, { y: 0, rotation: 0, duration: 0.7, ease: 'expo.out', stagger: 0.02 }, ls('s23', 0) + 0.2);
      pages.forEach((p, i) => {
        const k = i - (pages.length - 1) / 2;
        tl.to(p, { rotation: k * 9, x: k * 60, y: Math.abs(k) * 24 - 30, duration: 0.7, ease: 'back.out(1.5)' }, tB - 0.2 + i * 0.03);
      });
      tl.to(cover, { scale: 1.05, rotation: -2, duration: 0.4, ease: 'back.out(2)' }, tB - 0.15);
      popOut(sbD, tB - 0.2, 0.25);
      popIn(sbP, tB, { y0: 250 });
      popIn(bro, tB + 0.1, { rot: -4, rot0: -20, y0: 30, dur: 0.5, ease: 'back.out(2.4)' });
      const tE = ls('s23', 2) - 0.2;
      tl.to([head, fan, bro, sbP], { opacity: 0, y: -80, scale: 0.85, duration: 0.4, ease: 'power3.in', stagger: 0.03 }, tE);
      tl.fromTo(end, { opacity: 0, scale: 0.7, y: 60 }, { opacity: 1, scale: 1, y: 0, duration: 0.7, ease: 'back.out(1.6)' }, tE + 0.3);
      riseWords($('.see', end), ls('s23', 2) + 0.2, 0.08);
      popIn(sbW, tE + 0.5, { y0: 300 });
      tl.to(sbW, { rotation: -6, duration: 0.25, yoyo: true, repeat: 7, ease: 'sine.inOut' }, tE + 1.2);
      confetti(s, 540, 760, ls('s23', 2) + 0.6, 50, 560);
      tl.to('#story', { opacity: 0, duration: 0.4 }, tE);
    }

    tl.set({}, {}, T.total);
  }

  // ---------------------------------------------------------------- Film-Korn
  const grain = $('#grain');
  {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'); const d = g.createImageData(256, 256); const r = makeRng(7);
    for (let i = 0; i < d.data.length; i += 4) { const v = r() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0);
    grain.style.backgroundImage = `url(${c.toDataURL()})`;
  }

  // ---------------------------------------------------------------- Gesprochener Text als Animations-Typo
  // Satzteile, die schon als Grafik in der Szene stehen (Überschriften, Fragen, Kacheln, Endcard),
  // werden dort gezeigt. Alle anderen laufen hier Wort für Wort im Sprechtakt ein.
  const IN_SCENE = (seg, i) => seg.q || ['s01', 's03', 's04', 's21', 's22', 's23'].includes(seg.id)
    || (seg.id === 's02') || (seg.id === 's05' && i === 3);
  // Schlüsselwörter (gelb markiert) und Pointen (Marker-Schrift)
  const HL = {
    's05:0': ['Quereinsteiger'], 's05:1': ['Profi'], 's05:2': ['levelst', 'auf!'],
    's07:0': ['Onboarding'], 's07:1': ['Durchstarten.'], 's07:2': ['Grundlagen'], 's07:3': ['online.'], 's07:4': ['Heimspielserie!'],
    's09:0': ['Fleisch', 'Profil,'], 's09:1': ['Grillschule,'], 's09:2': ['Bratenschule'], 's09:4': ['Profis:'], 's09:5': ['Meat', 'Masterclass.'],
    's11:0': ['Wurst', 'Schinken'], 's11:1': ['Welt.'], 's11:2': ['Voll', 'Wurst!'], 's11:3': ['Food', 'Stylist'], 's11:4': ['Platten', 'Fingern.'],
    's13:0': ['kulinarische', 'Reise,'], 's13:1': ['Fromage', 'Voyage'], 's13:2': ['Käse-Masterclass:'],
    's15:0': ["Rock'", 'Küche', 'Fisch'], 's15:1': ['hautnah'],
    's17:0': ['Führungstraining'], 's17:1': ['eins,', 'zwei', 'drei,'], 's17:2': ['Ausbilderschein'], 's17:3': ['Meisterpflicht'],
    's19:1': ['Hands', 'Meat,'], 's19:2': ['Handwerk'], 's19:3': ['Ausbildung'],
  };
  const PUNCH = new Set(['s09:3', 's13:3', 's15:2', 's17:4', 's19:0', 's19:4']);
  const kin = $('#kin');
  function buildKinetic() {
    const items = [];
    T.segments.forEach((seg) => seg.lines.forEach((l, i) => { if (!IN_SCENE(seg, i)) items.push({ seg, l, i, key: `${seg.id}:${i}` }); }));
    items.forEach((it, n) => {
      const { l, key } = it;
      const punch = PUNCH.has(key);
      const hl = new Set((HL[key] || []).map((x) => x.toLowerCase()));
      const words = l.words.map((x) => ({ ...x, txt: x.w.replace(/^–$/, '').replace(/\s*–\s*/g, '') })).filter((x) => x.txt);
      // auf 1–2 Zeilen verteilen
      const total = words.reduce((a, x) => a + x.txt.length + 1, 0);
      let rows = [words];
      if (total > 17) {
        let best = 1, bestD = 1e9, acc = 0;
        words.forEach((x, j) => { acc += x.txt.length + 1; const d = Math.abs(acc - total / 2); if (j < words.length - 1 && d < bestD) { bestD = d; best = j + 1; } });
        rows = [words.slice(0, best), words.slice(best)];
      }
      const longest = Math.max(...rows.map((r) => r.reduce((a, x) => a + x.txt.length + 1, -1)));
      const size = Math.min(punch ? 104 : 88, Math.floor(980 / (longest * (punch ? 0.56 : 0.64))));
      const line = el('div', 'kin-line' + (punch ? ' punch' : ''), null, kin);
      if (rows.length === 1) line.style.top = '1420px';
      rows.forEach((r) => {
        const row = el('div', 'kin-row', null, line);
        r.forEach((x) => {
          const isHl = !punch && hl.has(x.w.toLowerCase());
          const m = el('span', 'km' + (isHl ? ' hl' : ''), null, row);
          if (isHl) x.box = el('span', 'hl-box', null, m);
          x.el = el('span', 'ki', x.txt, m);
          x.el.style.fontSize = size + 'px';
          m.style.margin = `0 ${Math.round(size * (punch ? 0.16 : 0.12))}px`;
        });
      });
      const next = items[n + 1];
      const show = l.s - 0.1;
      const lastOfSeg = it.i === it.seg.lines.length - 1;
      const hide = lastOfSeg ? l.e + 0.2 : (next && next.l.s - l.e < 0.6 ? next.l.s - 0.12 : l.e + 0.45);
      tl.set(line, { visibility: 'visible' }, show);
      words.forEach((x) => {
        const t = Math.max(show, x.s - 0.05);
        if (punch) tl.fromTo(x.el, { scale: 0, rotation: -18, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.42, ease: 'back.out(2.8)' }, t);
        else tl.fromTo(x.el, { yPercent: 115, rotation: 7, opacity: 0 }, { yPercent: 0, rotation: 0, opacity: 1, duration: 0.42, ease: 'expo.out' }, t);
        if (x.box) {
          tl.fromTo(x.box, { scaleX: 0 }, { scaleX: 1, duration: 0.32, ease: 'power3.out' }, t + 0.04);
          tl.to(x.el, { color: '#1d1d1b', duration: 0.12 }, t + 0.12);
        }
      });
      tl.to(line, { yPercent: -35, opacity: 0, duration: 0.24, ease: 'power2.in' }, hide - 0.2);
      tl.set(line, { visibility: 'hidden' }, hide + 0.05);
    });
  }

  // ---------------------------------------------------------------- Steuerung
  function seek(t) {
    tl.time(Math.min(t, T.total), false);
    const f = Math.round(t * T.fps);
    grain.style.backgroundPosition = `${(f * 73) % 256}px ${(f * 151) % 256}px`;
  }
  window.__seek = seek;
  window.__total = T.total;
  window.__fps = T.fps;
  window.__ready = (async () => {
    await document.fonts.ready;
    await Promise.all(['900 40px Outfit', '800 40px Outfit', '600 40px Outfit', '40px Marker', '40px "Noto Color Emoji"'].map((f) => document.fonts.load(f, '🌍A')));
    build();
    buildKinetic();
    await Promise.all([...document.images].map((i) => (i.complete ? i.decode().catch(() => {}) : new Promise((r) => { i.onload = i.onerror = r; }))));
    seek(0);
    return true;
  })();

  const params = new URLSearchParams(location.search);
  if (!params.has('render')) {
    document.body.classList.add('preview');
    const vp = $('#viewport');
    const fit = () => { const k = Math.min((innerHeight - 70) / 1920, (innerWidth - 20) / 1080); vp.style.width = 1080 * k + 'px'; vp.style.height = 1920 * k + 'px'; css(stage, { transform: `scale(${k})`, transformOrigin: 'top left', width: '1080px', height: '1920px' }); };
    fit(); addEventListener('resize', fit);
    const ctr = $('#controls'); ctr.hidden = false;
    const audio = $('#voice'); const btn = $('#play'); const scrub = $('#scrub'); const time = $('#time');
    const loop = () => { seek(audio.currentTime); scrub.value = (audio.currentTime / T.total) * 1000; time.textContent = audio.currentTime.toFixed(1) + ' s'; if (!audio.paused) requestAnimationFrame(loop); };
    btn.onclick = () => { if (audio.paused) { audio.play(); btn.textContent = '❚❚ Pause'; loop(); } else { audio.pause(); btn.textContent = '▶ Abspielen'; } };
    scrub.oninput = () => { audio.currentTime = (scrub.value / 1000) * T.total; loop(); };
    if (params.has('t')) { audio.currentTime = +params.get('t'); window.__ready.then(() => seek(+params.get('t'))); }
  }
})();
