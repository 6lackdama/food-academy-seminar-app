/* Seminare 2027 – Motion-Graphic-Video (Instagram Reel, 1080×1920)
 * Alles läuft über EINE pausierte GSAP-Timeline. Die Zeitpunkte kommen aus src/timing.js
 * (Sprachspur), sodass Animation + Untertitel automatisch zur Stimme passen.
 * window.__seek(t) setzt das Bild auf Sekunde t (wird beim Rendern Bild für Bild aufgerufen).
 */
(() => {
  const T = window.TIMING;
  const A = '../assets/';
  const $ = (s, el = document) => el.querySelector(s);
  const cam = $('#cam');
  const tl = gsap.timeline({ paused: true });

  // ---------- Hilfen ----------
  let seed = 2027;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const rr = (a, b) => a + (b - a) * rnd();

  const segs = Object.fromEntries(T.segments.map((s) => [s.id, s]));
  const order = [...new Set(T.segments.map((s) => s.scene))];
  const sStart = (sc) => T.segments.find((s) => s.scene === sc).start;
  const sEnd = (sc) => { const i = order.indexOf(sc); return i < order.length - 1 ? sStart(order[i + 1]) : T.total; };
  const norm = (x) => x.toLowerCase().replace(/[^a-zäöüß0-9]/g, '');
  /** Startzeit (oder Ende) des Wortes in Satz id, das mit `needle` beginnt. */
  function w(id, needle, which = 's') {
    const s = segs[id];
    const hit = s.words.find((x) => norm(x.w).startsWith(norm(needle)));
    if (!hit) { console.warn('Wort nicht gefunden:', id, needle); return s.start; }
    return hit[which];
  }

  function el(tag, cls, html, parent) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  }
  function img(src, cls, parent, style = {}) {
    const i = el('img', cls, null, parent);
    i.src = src; Object.assign(i.style, style);
    return i;
  }
  function split(e) {
    e.innerHTML = [...e.textContent].map((c) => `<span class="ch">${c === ' ' ? ' ' : c}</span>`).join('');
    return [...e.querySelectorAll('.ch')];
  }
  const heartPath = 'M50 86 L15 51 C3 39 9 15 30 15 C40 15 46 21 50 28 C54 21 60 15 70 15 C91 15 97 39 85 51 Z';
  function heartSVG(filled, gradId) {
    return filled
      ? `<svg viewBox="0 0 100 100"><path d="${heartPath}" fill="none" stroke="url(#${gradId})" stroke-width="13" stroke-linejoin="round"/></svg>`
      : `<svg viewBox="0 0 100 100"><path d="${heartPath}" fill="#bfc4c9" stroke="#bfc4c9" stroke-width="13" stroke-linejoin="round"/></svg>`;
  }
  function bigNum(parent, txt, color, opacity, x, y, size = 1000) {
    const s = el('div', 'bignum', `<svg width="${size}" height="${size * 1.1}" viewBox="0 0 ${size} ${size * 1.1}"><text x="0" y="${size * 0.9}" style="font-size:${size}px" stroke="${color}" stroke-opacity="${opacity}">${txt}</text></svg>`, parent);
    Object.assign(s.style, { left: x + 'px', top: y + 'px' });
    return s;
  }

  function shake(at, amp = 16, dur = 0.32) {
    const n = 6;
    for (let i = 0; i < n; i++) {
      const k = 1 - i / n;
      tl.to(cam, { x: rr(-amp, amp) * k, y: rr(-amp, amp) * k, rotation: rr(-0.5, 0.5) * k, duration: dur / n, ease: 'none' }, at + (i * dur) / n);
    }
    tl.to(cam, { x: 0, y: 0, rotation: 0, duration: dur / n, ease: 'none' }, at + dur);
  }

  const scenes = {};
  function scene(name, bg) {
    const s = el('section', `scene bg-${bg}`, null, cam);
    s.dataset.name = name;
    scenes[name] = s;
    return s;
  }
  /** Übergang: neue Szene wird diagonal hereingewischt, ein farbiger Streifen läuft an der Kante mit. */
  function enter(name, at, stripe = '') {
    const s = scenes[name];
    tl.fromTo(s, { '--p': 0 }, { '--p': 1, duration: 0.5, ease: 'power3.inOut' }, at);
    const st = el('div', `stripe ${stripe}`, null, cam);
    tl.fromTo(st, { x: -300 }, { x: 1900, duration: 0.5, ease: 'power3.inOut' }, at);
    const prev = order[order.indexOf(name) - 1];
    if (prev) tl.set(scenes[prev], { visibility: 'hidden' }, at + 0.55);
  }
  /** Leichtes Schweben (ohne Zufall pro Bild – deterministisch). */
  function bob(target, from, to, amp = 14, period = 1.6, rot = 0) {
    const n = Math.max(1, Math.floor((to - from) / period));
    for (let i = 0; i < n; i++) {
      tl.to(target, { y: (i % 2 ? 1 : -1) * amp, rotation: rot ? (i % 2 ? rot : -rot) : undefined, duration: period, ease: 'sine.inOut' }, from + i * period);
    }
  }

  // =====================================================================
  // 1) INTRO – Franz stellt sich vor
  // =====================================================================
  {
    const s = scene('intro', 'slate');
    s.classList.add('first');
    const logo = img(A + 'img/food-academy-fresh-logo.svg', 'abs logo', s);
    const ring = el('div', 'abs ring', `<svg viewBox="0 0 900 900"><circle cx="450" cy="450" r="430" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="6" stroke-dasharray="18 26"/></svg>`, s);
    const blob = el('div', 'abs blob', null, s);
    const sb = img(A + 'img/peace.webp', 'sb', s, { left: '300px', top: '520px', width: '480px' });
    const hey = el('div', 'abs hey', 'HEY!', s);
    const np = el('div', 'abs nameplate', '<div class="n">FRANZ</div><br><div class="r">FRESH-TRAINER</div>', s);
    const sp = img(A + 'food/p05_308.webp', 'food', s, { left: '760px', top: '1010px', width: '300px' });

    const t0 = segs.s01.start;
    tl.fromTo(blob, { scale: 0 }, { scale: 1, duration: 0.7, ease: 'back.out(1.7)' }, 0.05);
    tl.fromTo(ring, { scale: 0.4, opacity: 0, rotation: -90 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.9, ease: 'power3.out' }, 0.1);
    tl.to(ring, { rotation: 60, duration: sEnd('intro'), ease: 'none' }, 1.0);
    tl.fromTo(logo, { y: -60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }, 0.2);
    tl.fromTo(sb, { y: 520, scale: 0.6, rotation: -12 }, { y: 0, scale: 1, rotation: 0, duration: 0.75, ease: 'back.out(1.5)' }, 0.3);
    bob(sb, 1.1, sEnd('intro'), 12, 0.9, 2);
    tl.fromTo(hey, { scale: 3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2.2)' }, t0);
    shake(t0 + 0.15, 14);
    tl.fromTo(np, { x: -900 }, { x: 0, duration: 0.55, ease: 'power4.out' }, w('s01', 'Franz') - 0.1);
    tl.fromTo($('.r', np), { scaleX: 0, transformOrigin: 'left center' }, { scaleX: 1, duration: 0.4, ease: 'power3.out' }, w('s01', 'Fresh') - 0.05);
    tl.fromTo(sp, { scale: 0, rotation: -40 }, { scale: 1, rotation: 0, duration: 0.6, ease: 'back.out(1.6)' }, w('s01', 'Food'));
  }

  // =====================================================================
  // 2) COVER – Die Broschüre fliegt rein
  // =====================================================================
  {
    const s = scene('cover', 'orange');
    const heart = el('div', 'abs', `<svg width="1400" height="1400" viewBox="0 0 100 100"><path d="${heartPath}" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="7" stroke-linejoin="round"/></svg>`, s);
    Object.assign(heart.style, { left: '-160px', top: '120px' });
    const num = bigNum(s, '27', '#fff', 0.4, 330, 980, 900);
    const numText = $('text', num);
    const persp = el('div', 'abs persp', null, s);
    const card = el('div', 'cover-card', null, persp);
    img(A + 'pages/cover.webp', '', card);
    const t1 = el('div', 'abs center-x title-xl', 'SEMINARE', s);
    t1.style.top = '1112px';
    const yr = el('div', 'abs y-marker', '2027', s);
    Object.assign(yr.style, { left: '640px', top: '1010px', transform: 'rotate(-8deg)' });
    const sub = el('div', 'abs center-x', 'FÜR DIE FRISCHETHEKE', s);
    Object.assign(sub.style, { top: '1270px', font: '900 66px/1 Outfit', color: '#3a2016', letterSpacing: '.02em' });

    const at = sStart('cover') - 0.3;
    enter('cover', at, '');
    tl.fromTo(heart, { scale: 0.6, rotation: -20 }, { scale: 1, rotation: 6, duration: sEnd('cover') - at, ease: 'power1.out' }, at);
    tl.fromTo(numText, { strokeDasharray: 5200, strokeDashoffset: 5200 }, { strokeDashoffset: 0, duration: 2.4, ease: 'power2.inOut' }, at + 0.3);
    tl.fromTo(card, { rotationY: -80, rotationX: 18, x: -700, z: -500 }, { rotationY: 10, rotationX: 4, x: 0, z: 0, duration: 0.95, ease: 'power3.out' }, at + 0.2);
    tl.to(card, { rotationY: -8, rotationX: -3, duration: 2.6, ease: 'sine.inOut' }, at + 1.15);
    tl.fromTo(split(t1), { y: 160, opacity: 0, rotation: 12 }, { y: 0, opacity: 1, rotation: 0, duration: 0.5, stagger: 0.04, ease: 'back.out(2)' }, w('s02', 'Seminare') - 0.1);
    tl.fromTo(yr, { scale: 0, rotation: -40 }, { scale: 1, rotation: -8, duration: 0.45, ease: 'back.out(2.4)' }, w('s02', '2027'));
    shake(w('s02', '2027') + 0.1, 12);
    tl.fromTo(sub, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.5, ease: 'power3.out' }, w('s02', 'Frischetheke') - 0.15);
    // Durch das Cover "hindurchzoomen"
    tl.to(card, { scale: 3.2, opacity: 0, duration: 0.5, ease: 'power3.in' }, sEnd('cover') - 0.45);
  }

  // =====================================================================
  // 3) MENSCHEN MACHEN DEN UNTERSCHIED – UND ZWAR DU!
  // =====================================================================
  {
    const s = scene('menschen', 'white');
    bigNum(s, '!', '#5b6066', 0.12, 560, 640, 1100);
    const box = el('div', 'abs center-x', null, s);
    box.style.top = '470px';
    const l1 = el('div', 'kin', 'MENSCHEN', box); l1.style.fontSize = '182px';
    const l2 = el('div', 'kin', 'MACHEN DEN', box); Object.assign(l2.style, { fontSize: '92px', color: '#5b6066', margin: '14px 0' });
    const l3 = el('div', 'kin', 'UNTERSCHIED', box); l3.style.fontSize = '138px';
    const heart = el('div', 'abs', `<svg width="980" height="980" viewBox="0 0 100 100"><path d="${heartPath}" fill="none" stroke="#FCE531" stroke-width="9" stroke-linejoin="round"/></svg>`, s);
    Object.assign(heart.style, { left: '50px', top: '330px' });
    const du = el('div', 'abs center-x kin', 'DU!', s);
    Object.assign(du.style, { top: '560px', fontSize: '400px', color: 'var(--o)' });
    const sb = img(A + 'img/strong.webp', 'sb', s, { left: '640px', top: '980px', width: '400px' });

    const at = sStart('menschen') - 0.3;
    enter('menschen', at, 'o');
    tl.fromTo(l1, { scale: 2.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.32, ease: 'power4.out' }, w('s03', 'Menschen') - 0.05);
    shake(w('s03', 'Menschen') + 0.2, 18);
    tl.fromTo(split(l2), { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.025, ease: 'back.out(2)' }, w('s03', 'machen') - 0.05);
    tl.fromTo(l3, { x: 1100 }, { x: 0, duration: 0.45, ease: 'power4.out' }, w('s03', 'Unterschied') - 0.1);
    const tDu = w('s03', 'du');
    tl.to(box, { y: -260, scale: 0.55, opacity: 0.18, duration: 0.45, ease: 'power3.inOut' }, w('s03', 'Und') - 0.15);
    tl.fromTo(heart, { scale: 0, rotation: -30 }, { scale: 1, rotation: 0, duration: 0.6, ease: 'back.out(1.6)' }, tDu - 0.2);
    tl.fromTo(du, { scale: 0, rotation: -15 }, { scale: 1, rotation: 0, duration: 0.45, ease: 'back.out(2.5)' }, tDu - 0.08);
    shake(tDu + 0.15, 24);
    tl.fromTo(sb, { x: 500, rotation: 30 }, { x: 0, rotation: -4, duration: 0.55, ease: 'back.out(1.5)' }, tDu);
  }

  // =====================================================================
  // 4) LEVEL – Vier Stufen: Fresh-ling → Fresh-Master
  // =====================================================================
  {
    const s = scene('level', 'slate');
    s.insertAdjacentHTML('beforeend', `<svg width="0" height="0" style="position:absolute"><defs><linearGradient id="hg" x1="0" x2="1"><stop offset="0" stop-color="#F6A21E"/><stop offset="1" stop-color="#FCE531"/></linearGradient></defs></svg>`);
    const title = el('div', 'abs center-x', 'DEIN LEVEL', s);
    Object.assign(title.style, { top: '190px', font: '900 150px/1 Outfit' });
    const sub = el('div', 'abs center-x', 'VOM EINSTEIGER ZUM EXPERTEN', s);
    Object.assign(sub.style, { top: '350px', font: '900 50px/1 Outfit', color: 'var(--o)' });

    const names = ['FRESH-LING', 'FRESH-KRAFT', 'FRESH-ALIST', 'FRESH-MASTER'];
    const words = ['Fresh-ling', 'Fresh-Kraft', 'Fresh-Alist', 'Fresh-Master'];
    const rows = names.map((n, i) => {
      const r = el('div', 'lvl', `<div class="hearts">${[0, 1, 2, 3].map((k) => heartSVG(k <= i, 'hg')).join('')}</div><div class="lbl">${n}</div>`, s);
      Object.assign(r.style, { left: 0, top: 1130 - i * 190 + 'px', width: 470 + i * 150 + 'px' });
      return r;
    });
    const path = el('div', 'abs', `<svg width="1080" height="1920"><path d="M1000 1215 L1000 600" stroke="#FCE531" stroke-width="12" stroke-linecap="round" fill="none" stroke-dasharray="1 0"/><path d="M965 640 L1000 590 L1035 640" stroke="#FCE531" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`, s);
    Object.assign(path.style, { left: 0, top: 0 });
    const think = img(A + 'img/think.webp', 'sb', s, { left: '700px', top: '1010px', width: '250px' });
    const king = img(A + 'img/king.webp', 'sb', s, { left: '640px', top: '1040px', width: '330px' });
    const tagQ = el('div', 'abs tag', 'QUEREINSTEIGER', s); Object.assign(tagQ.style, { left: '70px', top: '1325px' });
    const tagP = el('div', 'abs tag', 'PROFI', s); Object.assign(tagP.style, { left: '770px', top: '470px' });

    const at = sStart('level') - 0.3;
    enter('level', at, '');
    tl.fromTo(split(title), { y: -140, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.035, ease: 'back.out(2)' }, at + 0.3);
    tl.fromTo(sub, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4 }, at + 0.7);
    tl.fromTo(think, { scale: 0, rotation: 20 }, { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(2)' }, at + 0.6);
    rows.forEach((r, i) => {
      const t = Math.min(w('s04', words[i]) - 0.12, segs.s04.end);
      tl.fromTo(r, { x: -1000 }, { x: 0, duration: 0.45, ease: 'power4.out' }, t);
      tl.fromTo(r.querySelectorAll('svg'), { scale: 0 }, { scale: 1, duration: 0.3, stagger: 0.05, ease: 'back.out(3)' }, t + 0.18);
    });
    tl.fromTo(path, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.0, ease: 'power2.inOut' }, w('s05', 'Ob'));
    tl.fromTo(tagQ, { scale: 0 }, { scale: 1, duration: 0.35, ease: 'back.out(2.5)' }, w('s05', 'Quereinsteiger') - 0.05);
    tl.fromTo(tagP, { scale: 0 }, { scale: 1, duration: 0.35, ease: 'back.out(2.5)' }, w('s05', 'Profi') - 0.05);
    tl.to(think, { scale: 0, duration: 0.2, ease: 'power2.in' }, w('s05', 'Profi') - 0.1);
    tl.fromTo(king, { scale: 0, rotation: -20 }, { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(2)' }, w('s05', 'Profi') + 0.08);
    shake(w('s05', 'Profi') + 0.2, 10);
    tl.to(rows[3], { scale: 1.06, transformOrigin: 'left center', duration: 0.25, yoyo: true, repeat: 3, ease: 'sine.inOut' }, w('s05', 'Level') - 0.2);
  }

  // =====================================================================
  // 5–11) THEMEN – alle 35 Seminare als Karten
  // =====================================================================
  const CATS = [
    { scene: 'onboarding', name: 'ONBOARDING', sub: '& GRUNDLAGEN', bg: 'white', nrs: ['01', '02', '03', '04'], num: '1',
      food: [['petersilie', -40, 1060, 300, 'img'], ['p05_308', 790, 470, 280]] },
    { scene: 'fleisch', name: 'FLEISCH', bg: 'slate', nrs: ['05', '06', '07', '08', '09', '10'], num: '2',
      food: [['p05_364', -70, 1040, 420], ['p17_1098', 800, 430, 250], ['p40_2084', 760, 1090, 330]] },
    { scene: 'wurst', name: 'WURST', bg: 'orange', nrs: ['11', '12', '13'], num: '3',
      food: [['p20_1257', -60, 1080, 400], ['p03_145', 830, 420, 230], ['p18_1139', 740, 1100, 360]] },
    { scene: 'kaese', name: 'KÄSE', bg: 'white', nrs: ['14', '15', '16', '17', '18'], num: '4',
      food: [['p21_1277', -50, 1070, 360], ['p24_1408', 790, 430, 260], ['p35_1829', 760, 1110, 330]] },
    { scene: 'fisch', name: 'FISCH', bg: 'slate', nrs: ['19', '20', '21'], num: '5',
      food: [['p26_1450', -80, 1090, 460], ['p38_1906', 820, 420, 220]] },
    { scene: 'fuehrung', name: 'FÜHRUNG', sub: '& MANAGEMENT', bg: 'orange', nrs: ['22', '23', '24', '25', '26', '27', '28', '29', '30', '31'], num: '6',
      food: [['p29_1556', 800, 1060, 250]] },
    { scene: 'azubis', name: 'AUSBILDUNG', sub: '& WEITERBILDUNG', bg: 'slate', nrs: ['32', '33', '34', '35'], num: '7', pages: true,
      food: [] },
  ];
  const OPAQUE = ['24', '29', '30', '31'];

  CATS.forEach((c, ci) => {
    const s = scene(c.scene, c.bg);
    const light = c.bg === 'white';
    bigNum(s, c.num, light ? '#5b6066' : '#fff', light ? 0.13 : 0.22, 470, 760, 1150);
    const label = el('div', 'abs cat-label', `THEMA ${ci + 1}/${CATS.length}`, s);
    Object.assign(label.style, { background: light ? 'var(--o)' : c.bg === 'orange' ? '#fff' : 'var(--o)', color: c.bg === 'orange' ? 'var(--o)' : '#fff' });
    const count = el('div', 'abs cat-count', `${c.nrs.length} Seminare`, s);
    const nm = el('div', 'abs cat-name', c.name, s);
    const fs = Math.min(230, Math.floor(960 / (c.name.length * 0.7)));
    Object.assign(nm.style, { fontSize: fs + 'px', color: light ? 'var(--o)' : '#fff' });
    let subEl;
    if (c.sub) {
      subEl = el('div', 'abs cat-sub', c.sub, s);
      Object.assign(subEl.style, { top: 270 + fs * 0.98 + 'px', color: light ? 'var(--g)' : c.bg === 'orange' ? 'var(--ink)' : 'var(--o)' });
    }
    const cards = c.nrs.map((nr) => {
      const k = el('div', `card ${c.pages ? 'page' : ''} ${OPAQUE.includes(nr) ? 'opaque' : ''}`, null, s);
      img(A + (c.pages ? `pages/${nr}.webp` : `titles/${nr}.webp`), '', k);
      el('div', 'nr', nr, k);
      return k;
    });
    const foods = c.food.map(([f, x, y, wd, kind]) => img(A + (kind === 'img' ? `img/${f}.webp` : `food/${f}.webp`), 'food', s, { left: x + 'px', top: y + 'px', width: wd + 'px' }));

    const at = sStart(c.scene) - 0.3;
    const end = sEnd(c.scene);
    enter(c.scene, at, ci % 2 ? 'w' : '');
    tl.fromTo(label, { x: -500 }, { x: 0, duration: 0.4, ease: 'power3.out' }, at + 0.25);
    tl.fromTo(split(nm), { y: 220, opacity: 0, rotation: 14 }, { y: 0, opacity: 1, rotation: 0, duration: 0.5, stagger: 0.035, ease: 'back.out(1.9)' }, at + 0.3);
    shake(at + 0.62, 12);
    if (subEl) tl.fromTo(subEl, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.45, ease: 'power3.out' }, at + 0.65);
    tl.fromTo(count, { scale: 0, rotation: -40 }, { scale: 1, rotation: -5, duration: 0.45, ease: 'back.out(2.4)' }, at + 0.8);

    // Karten: fliegen nacheinander rein und stapeln sich
    const t0 = at + 0.85;
    const step = Math.min(0.85, (end - 0.45 - t0) / cards.length);
    const pose = cards.map(() => ({ x: rr(-16, 16), r: rr(-4, 4) }));
    cards.forEach((k, i) => {
      const t = t0 + i * step;
      tl.fromTo(k, { x: 1150, y: 80, rotation: 22, opacity: 1 }, { x: pose[i].x, y: 0, rotation: pose[i].r, duration: 0.5, ease: 'power4.out' }, t);
      for (let j = i + 1; j < cards.length; j++) {
        const d = j - i;
        tl.to(k, { y: -36 * d, scale: 1 - 0.05 * d, opacity: d > 3 ? 0 : 1 - 0.12 * d, duration: 0.4, ease: 'power3.out' }, t0 + j * step + 0.05);
      }
    });
    foods.forEach((f, i) => {
      tl.fromTo(f, { scale: 0, rotation: -35 + i * 25 }, { scale: 1, rotation: 0, duration: 0.6, ease: 'back.out(1.7)' }, at + 0.55 + i * 0.22);
      tl.to(f, { rotation: i % 2 ? 6 : -6, y: i % 2 ? -18 : 18, duration: end - at - 1.2, ease: 'sine.inOut' }, at + 1.2);
    });
  });

  // =====================================================================
  // 12) FRESH DIGITAL
  // =====================================================================
  {
    const s = scene('digital', 'slate');
    const logo = img(A + 'img/fresh-digital.webp', 'abs', s, { left: '150px', top: '170px', width: '780px' });
    const neu = el('div', 'abs', 'NEU!', s);
    Object.assign(neu.style, { left: '70px', top: '150px', font: '900 84px/1 Outfit', color: 'var(--o)', transform: 'rotate(-10deg)' });
    const tiles = [
      `<img class="art" src="${A}img/100-handgriffe.webp"><div><div class="big"><span class="cnt">0</span></div><div class="t1">HANDGRIFFE</div><div class="t2">als Video – kurz &amp; direkt aus der Praxis</div></div>`,
      `<img class="art" src="${A}img/edeka-nx.webp" style="height:150px;border-radius:24px"><div><div class="t1">BLENDED<br>LEARNING</div><div class="t2">Wissen, das zu dir passt</div></div>`,
      `<div class="wizz">Wizz<br>Up!</div><div><div class="t1">QUIZ-DUELL</div><div class="t2">Lernen. Spielen.<br>Wissen pushen!</div></div>`,
    ].map((h, i) => {
      const t = el('div', 'tile', h, s);
      t.style.top = 560 + i * 265 + 'px';
      return t;
    });
    const cnt = $('.cnt', tiles[0]);
    const sb = img(A + 'img/cool.webp', 'sb', s, { left: '790px', top: '1180px', width: '220px' });

    const at = sStart('digital') - 0.3;
    enter('digital', at, 'o');
    tl.fromTo(logo, { scale: 3, opacity: 0, rotation: -8 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.42, ease: 'power4.out' }, at + 0.3);
    shake(at + 0.6, 20);
    tl.fromTo(neu, { scale: 0 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' }, at + 0.75);
    const tw = [w('s13', '100'), w('s13', 'Blended'), w('s13', 'Quiz')];
    tiles.forEach((t, i) => tl.fromTo(t, { x: i % 2 ? 1100 : -1100, rotation: i % 2 ? 6 : -6 }, { x: 0, rotation: 0, duration: 0.5, ease: 'power4.out' }, tw[i] - 0.2));
    const o = { v: 0 };
    tl.to(o, { v: 100, duration: 1.0, ease: 'power2.out', onUpdate: () => { cnt.textContent = Math.round(o.v); } }, tw[0]);
    tl.fromTo($('.wizz', tiles[2]), { scale: 0.3, rotation: -30 }, { scale: 1, rotation: -4, duration: 0.5, ease: 'back.out(3)' }, tw[2] + 0.05);
    tl.fromTo(sb, { y: 900 }, { y: 0, duration: 0.5, ease: 'back.out(1.6)' }, w('s13', 'WizzUp') - 0.2);
  }

  // =====================================================================
  // 13) OUTRO – QR-Code zur App
  // =====================================================================
  {
    const s = scene('outro', 'orange');
    const hearts = [];
    for (let i = 0; i < 14; i++) {
      const h = el('div', 'abs', `<svg viewBox="0 0 100 100" width="100%" height="100%"><path d="${heartPath}" fill="none" stroke="#fff" stroke-opacity="${rr(0.15, 0.4).toFixed(2)}" stroke-width="10" stroke-linejoin="round"/></svg>`, s);
      const size = rr(60, 170);
      Object.assign(h.style, { left: rr(-40, 1000) + 'px', top: '1950px', width: size + 'px', height: size + 'px' });
      hearts.push(h);
    }
    const t1 = el('div', 'abs center-x', 'ALLE SEMINARE', s);
    Object.assign(t1.style, { top: '180px', font: '900 118px/1 Outfit' });
    const t2 = el('div', 'abs center-x', 'IN DER APP', s);
    Object.assign(t2.style, { top: '305px', font: '900 118px/1 Outfit', color: 'var(--ink)' });
    const card = el('div', 'abs qr-card', `<img src="${A}img/qr-app.svg">`, s);
    [[-7, -7, '0 0'], [557, -7, '0 0'], [-7, 557, '0 0'], [557, 557, '0 0']].forEach(([x, y], i) => {
      const c = el('div', 'corner', null, card);
      const r = ['40px 0 0 0', '0 40px 0 0', '0 0 0 40px', '0 0 40px 0'][i];
      const b = [['borderRight', 'borderBottom'], ['borderLeft', 'borderBottom'], ['borderRight', 'borderTop'], ['borderLeft', 'borderTop']][i];
      Object.assign(c.style, { left: x + 'px', top: y + 'px', borderRadius: r, [b[0]]: 'none', [b[1]]: 'none' });
    });
    const scan = el('div', 'scanline', null, card);
    const me = el('div', 'abs scanme', 'Scan mich!', s);
    const sb = img(A + 'img/love.webp', 'sb', s, { left: '800px', top: '1020px', width: '270px' });
    const logo = img(A + 'img/food-academy-fresh-logo.svg', 'abs', s, { left: '340px', top: '1190px', width: '400px' });

    const at = sStart('outro') - 0.3;
    enter('outro', at, 'w');
    hearts.forEach((h, i) => tl.to(h, { y: -2300, rotation: rr(-60, 60), duration: rr(4, 7), ease: 'none' }, at + rr(0, 3.5)));
    tl.fromTo(split(t1), { y: -150, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.03, ease: 'back.out(2)' }, at + 0.3);
    tl.fromTo(t2, { scale: 0 }, { scale: 1, duration: 0.45, ease: 'back.out(2.5)' }, w('s14', 'App') - 0.15);
    tl.fromTo(card, { scale: 0, rotation: 12 }, { scale: 1, rotation: 0, duration: 0.7, ease: 'elastic.out(1, 0.6)' }, at + 0.6);
    const tScan = w('s14', 'Code');
    tl.fromTo(me, { scale: 0, rotation: -40 }, { scale: 1, rotation: -10, duration: 0.45, ease: 'back.out(2.6)' }, tScan - 0.1);
    shake(tScan + 0.1, 14);
    for (let i = 0; i < 4; i++) {
      tl.fromTo(scan, { top: 60, opacity: 1 }, { top: 568, duration: 0.8, ease: 'sine.inOut' }, tScan + i * 0.85);
    }
    tl.to(scan, { opacity: 0, duration: 0.2 }, tScan + 3.4);
    tl.fromTo(sb, { x: 400, rotation: 25 }, { x: 0, rotation: -6, duration: 0.6, ease: 'back.out(1.6)' }, w('s14', 'wir') - 0.1);
    tl.fromTo(logo, { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, w('s14', 'Theke') - 0.2);
    tl.to(card, { scale: 1.04, duration: 0.5, yoyo: true, repeat: 3, ease: 'sine.inOut' }, segs.s14.end + 0.2);
  }

  tl.set({}, {}, T.total);

  // =====================================================================
  // Untertitel (Wort für Wort hervorgehoben)
  // =====================================================================
  const subsEl = $('#subs');
  const subsBack = el('div', 'back', null, subsEl);
  const subsFront = el('div', 'front', null, subsEl);
  const chunks = [];
  T.segments.forEach((s) => {
    let cur = [];
    const flush = () => { if (cur.length) chunks.push(cur); cur = []; };
    s.words.forEach((wd) => {
      const len = cur.reduce((a, x) => a + x.w.length + 1, 0) + wd.w.length;
      if (cur.length && (len > 19 || cur.length >= 4)) flush();
      cur.push(wd);
      if (/[.!?:,–]$/.test(wd.w) && cur.length >= 2) flush();
    });
    flush();
  });
  // jeden Chunk bis zum Start des nächsten (max. +0.5 s) stehen lassen
  chunks.forEach((c, i) => {
    c.start = c[0].s;
    const next = chunks[i + 1];
    c.end = Math.min(c[c.length - 1].e + 0.5, next ? next[0].s : Infinity);
  });
  let shown = null;
  function renderSubs(t) {
    const c = chunks.find((x) => t >= x.start - 0.02 && t < x.end);
    if (c !== shown) {
      shown = c;
      const html = c ? c.map((x) => `<span class="w">${x.w.replace(/[–]/g, '')}</span>`).join(' ') : '';
      subsBack.innerHTML = html; subsFront.innerHTML = html;
    }
    if (!c) return;
    c.forEach((x, i) => {
      const on = t >= x.s && (i === c.length - 1 || t < c[i + 1].s);
      subsBack.children[i].classList.toggle('on', on); subsFront.children[i].classList.toggle('on', on);
    });
    const k = Math.min(1, (t - c.start) / 0.12);
    subsEl.style.transform = `scale(${0.86 + 0.14 * (1 - Math.pow(1 - k, 3))})`;
  }

  // =====================================================================
  // Steuerung
  // =====================================================================
  function seek(t) { tl.time(Math.min(t, T.total), false); renderSubs(t); }
  window.__seek = seek;
  window.__total = T.total;
  window.__fps = T.fps;
  window.__ready = (async () => {
    await document.fonts.ready;
    await Promise.all(['900 40px Outfit', '800 40px Outfit', '600 40px Outfit', '40px Marker'].map((f) => document.fonts.load(f)));
    await Promise.all([...document.images].map((i) => (i.complete ? i.decode().catch(() => {}) : new Promise((r) => { i.onload = i.onerror = r; }))));
    seek(0);
    return true;
  })();

  const params = new URLSearchParams(location.search);
  if (!params.has('render')) {
    document.body.classList.add('preview');
    const vp = $('#viewport');
    const fit = () => { const k = Math.min((innerHeight - 70) / 1920, (innerWidth - 20) / 1080); vp.style.transform = `scale(${k})`; vp.style.width = 1080 * k + 'px'; vp.style.height = 1920 * k + 'px'; $('#stage').style.transform = `scale(${k})`; $('#stage').style.transformOrigin = 'top left'; $('#stage').style.width = '1080px'; $('#stage').style.height = '1920px'; vp.style.transform = ''; };
    fit(); addEventListener('resize', fit);
    const ctr = $('#controls'); ctr.hidden = false;
    const audio = $('#voice'); const btn = $('#play'); const scrub = $('#scrub'); const time = $('#time');
    const loop = () => { seek(audio.currentTime); scrub.value = (audio.currentTime / T.total) * 1000; time.textContent = audio.currentTime.toFixed(1) + ' s'; if (!audio.paused) requestAnimationFrame(loop); };
    btn.onclick = () => { if (audio.paused) { audio.play(); btn.textContent = '❚❚ Pause'; loop(); } else { audio.pause(); btn.textContent = '▶ Abspielen'; } };
    scrub.oninput = () => { audio.currentTime = (scrub.value / 1000) * T.total; loop(); };
    if (params.has('t')) { audio.currentTime = +params.get('t'); window.__ready.then(() => seek(+params.get('t'))); }
  }
})();
