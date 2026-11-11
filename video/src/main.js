/* Seminare 2027 – Motion-Graphic-Video (Instagram Reel, 1080×1920)
 * Alles läuft über EINE pausierte GSAP-Timeline. Die Zeitpunkte kommen aus src/timing.js
 * (Sprachspur): Animation, Karten und Untertitel sitzen automatisch auf Franz' Wörtern.
 * window.__seek(t) setzt das Bild auf Sekunde t (wird beim Rendern Bild für Bild aufgerufen).
 */
(() => {
  const T = window.TIMING;
  const A = '../assets/';
  const $ = (s, root = document) => root.querySelector(s);
  const cam = $('#cam');
  const stage = $('#stage');
  const tl = gsap.timeline({ paused: true });

  // ---------- Hilfen ----------
  const makeRng = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const rnd = makeRng(2027);
  const rr = (a, b) => a + (b - a) * rnd();

  const segs = Object.fromEntries(T.segments.map((s) => [s.id, s]));
  const order = [...new Set(T.segments.map((s) => s.scene))];
  const segsOf = (sc) => T.segments.filter((s) => s.scene === sc);
  const sStart = (sc) => segsOf(sc)[0].start;
  const sEnd = (sc) => { const i = order.indexOf(sc); return i < order.length - 1 ? sStart(order[i + 1]) : T.total; };
  const norm = (x) => x.toLowerCase().replace(/[^a-zäöüß0-9]/g, '');
  /** Startzeit (oder Ende) des Wortes in Satz id, das mit `needle` beginnt. */
  function w(id, needle, which = 's') {
    const hit = segs[id].words.find((x) => norm(x.w).startsWith(norm(needle)));
    if (!hit) { console.warn('Wort nicht gefunden:', id, needle); return segs[id].start; }
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
  const css = (e, st) => Object.assign(e.style, st);
  function split(e) {
    e.innerHTML = [...e.textContent].map((c) => `<span class="ch">${c}</span>`).join('');
    return [...e.querySelectorAll('.ch')];
  }
  const heartPath = 'M50 86 L15 51 C3 39 9 15 30 15 C40 15 46 21 50 28 C54 21 60 15 70 15 C91 15 97 39 85 51 Z';
  const starPath = 'M50 0 C54 36 64 46 100 50 C64 54 54 64 50 100 C46 64 36 54 0 50 C36 46 46 36 50 0Z';
  const heartSVG = (filled) => filled
    ? `<svg viewBox="0 0 100 100"><path d="${heartPath}" fill="none" stroke="url(#hg)" stroke-width="13" stroke-linejoin="round"/></svg>`
    : `<svg viewBox="0 0 100 100"><path d="${heartPath}" fill="#bfc4c9" stroke="#bfc4c9" stroke-width="13" stroke-linejoin="round"/></svg>`;
  function bigNum(parent, txt, color, opacity, x, y, size = 1000) {
    const s = el('div', 'bignum', `<svg width="${size}" height="${size * 1.1}" viewBox="0 0 ${size} ${size * 1.1}"><text x="0" y="${size * 0.9}" style="font-size:${size}px" stroke="${color}" stroke-opacity="${opacity}">${txt}</text></svg>`, parent);
    css(s, { left: x + 'px', top: y + 'px' });
    return s;
  }
  function emoji(parent, ch, x, y, size, rot = 0) {
    const e = el('div', 'emoji', ch, parent);
    css(e, { left: x + 'px', top: y + 'px', fontSize: size + 'px', rotate: rot + 'deg' });
    return e;
  }
  function pop(target, at, from = 0, ease = 'back.out(2.6)', dur = 0.42, rot = 0) {
    tl.fromTo(target, { scale: from, rotation: rot - 25 }, { scale: 1, rotation: rot, duration: dur, ease }, at);
  }
  function sparkle(parent, x, y, size, at, color = '#FCE531') {
    const s = el('div', 'abs', `<svg viewBox="0 0 100 100" width="${size}" height="${size}"><path d="${starPath}" fill="${color}"/></svg>`, parent);
    css(s, { left: x + 'px', top: y + 'px', zIndex: 8 });
    tl.fromTo(s, { scale: 0, rotation: -90 }, { scale: 1, rotation: 0, duration: 0.22, ease: 'back.out(3)' }, at);
    tl.to(s, { scale: 0, rotation: 90, duration: 0.25, ease: 'power2.in' }, at + 0.4);
  }
  function burst(parent, cx, cy, at, color) {
    for (let i = 0; i < 3; i++) sparkle(parent, cx + rr(-260, 260), cy + rr(-160, 160), rr(50, 95), at + i * 0.05, color);
  }
  function shake(at, amp = 16, dur = 0.3) {
    const n = 6;
    for (let i = 0; i < n; i++) {
      const k = 1 - i / n;
      tl.to(cam, { x: rr(-amp, amp) * k, y: rr(-amp, amp) * k, duration: dur / n, ease: 'none' }, at + (i * dur) / n);
    }
    tl.to(cam, { x: 0, y: 0, duration: dur / n, ease: 'none' }, at + dur);
  }
  /** kurzer Zoom-Punch der ganzen Kamera */
  function punch(at, k = 1.045) { tl.fromTo(cam, { scale: k }, { scale: 1, duration: 0.3, ease: 'power3.out' }, at); }
  /** Buchstaben-Scramble (deterministisch) */
  function scramble(e, at, dur = 0.45) {
    const fin = e.textContent;
    const pool = 'ABCDEFGHIJKLMNOPRSTUVWXYZ0123456789#&!?';
    const o = { p: 0 };
    tl.fromTo(o, { p: 0 }, { p: 1, duration: dur, ease: 'none', onUpdate: () => {
      const n = fin.length; const shown = Math.floor(o.p * (n + 1)); const tick = Math.floor(o.p * 30);
      e.textContent = [...fin].map((c, i) => (i < shown || c === ' ' ? c : pool[(i * 7 + tick * 13) % pool.length])).join('');
    } }, at);
  }
  /** Laufband wie auf den Azubi-Seiten der Broschüre */
  function band(parent, text, top, rot, bg, fg, from, to, dir) {
    const b = el('div', 'band', null, parent);
    css(b, { top: top + 'px', background: bg, color: fg, rotate: rot + 'deg' });
    const inner = el('div', 'band-in', `${text} • `.repeat(14), b);
    tl.fromTo(inner, { x: dir > 0 ? -1400 : 0 }, { x: dir > 0 ? 0 : -1400, duration: to - from, ease: 'none' }, from);
    return b;
  }
  /** leichtes Schweben */
  function bob(target, from, to, amp = 12, period = 0.9, rot = 2) {
    const n = Math.max(1, Math.floor((to - from) / period));
    for (let i = 0; i < n; i++) tl.to(target, { y: (i % 2 ? 1 : -1) * amp, rotation: i % 2 ? rot : -rot, duration: period, ease: 'sine.inOut' }, from + i * period);
  }

  // ---------- Szenen & Übergänge ----------
  const scenes = {};
  function scene(name, bg) {
    const s = el('section', `scene bg-${bg}`, null, cam);
    scenes[name] = s;
    return s;
  }
  function enter(name, at, type = 'wipe', stripe = '') {
    const s = scenes[name];
    const prevName = order[order.indexOf(name) - 1];
    const prev = prevName && scenes[prevName];
    tl.set(s, { visibility: 'visible' }, at);
    if (type === 'wipe') {
      tl.fromTo(s, { '--p': 0 }, { '--p': 1, duration: 0.5, ease: 'power3.inOut' }, at);
      const st = el('div', `stripe ${stripe}`, null, cam);
      tl.fromTo(st, { x: -300 }, { x: 1900, duration: 0.5, ease: 'power3.inOut' }, at);
    } else if (type === 'whip') {
      tl.fromTo(s, { xPercent: 100, skewX: -14, filter: 'blur(26px)' }, { xPercent: 0, skewX: 0, filter: 'blur(0px)', duration: 0.42, ease: 'expo.out' }, at);
      if (prev) tl.to(prev, { xPercent: -70, skewX: -14, filter: 'blur(26px)', duration: 0.3, ease: 'power2.in' }, at - 0.04);
    } else if (type === 'zoom') {
      tl.fromTo(s, { scale: 2.4, rotation: 9, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.5, ease: 'expo.out' }, at);
      if (prev) tl.to(prev, { scale: 0.75, opacity: 0, duration: 0.35, ease: 'power2.in' }, at);
    } else if (type === 'iris') {
      tl.fromTo(s, { clipPath: 'circle(0% at 50% 42%)' }, { clipPath: 'circle(80% at 50% 42%)', duration: 0.55, ease: 'power3.inOut' }, at);
    }
    if (prev) tl.set(prev, { visibility: 'hidden' }, at + 0.62);
  }

  // =====================================================================
  function build() {
    // gemeinsame SVG-Verläufe
    stage.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" style="position:absolute"><defs><linearGradient id="hg" x1="0" x2="1"><stop offset="0" stop-color="#F6A21E"/><stop offset="1" stop-color="#FCE531"/></linearGradient></defs></svg>`);

    // ===================== 1) INTRO =====================
    {
      const s = scene('intro', 'slate');
      css(s, { visibility: 'visible' });
      // Hook: 3 schnelle Flash-Cuts
      const flashes = [['NEU', 'var(--o)', '#fff'], ['2027', 'var(--y)', 'var(--b)'], ['FRESH', 'var(--b)', 'var(--y)']].map(([t, bg, fg]) => {
        const f = el('div', 'flash', `<span>${t}</span>`, s);
        css(f, { background: bg, color: fg });
        return f;
      });
      flashes.forEach((f, i) => {
        tl.set(f, { visibility: 'visible' }, i * 0.3);
        tl.fromTo($('span', f), { scale: 1.5, rotation: i % 2 ? 6 : -6 }, { scale: 1, rotation: 0, duration: 0.3, ease: 'expo.out' }, i * 0.3);
        tl.set(f, { visibility: 'hidden' }, (i + 1) * 0.3);
      });
      const t1 = 0.9;
      const logo = img(A + 'img/food-academy-fresh-logo.svg', 'abs logo', s);
      const ring = el('div', 'abs ring', `<svg viewBox="0 0 900 900"><circle cx="450" cy="450" r="430" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="6" stroke-dasharray="18 26"/></svg>`, s);
      const blob = el('div', 'abs blob', null, s);
      const sb = img(A + 'img/peace.webp', 'sb', s, { left: '300px', top: '520px', width: '480px' });
      const hey = el('div', 'abs hey', 'HEY!', s);
      const np = el('div', 'abs nameplate', '<div class="n">FRANZ</div><br><div class="r">FRESH-TRAINER</div>', s);
      const em = emoji(s, '👋', 790, 380, 170, 12);
      tl.fromTo(blob, { scale: 0 }, { scale: 1, duration: 0.6, ease: 'back.out(1.7)' }, t1);
      tl.fromTo(ring, { scale: 0.4, opacity: 0, rotation: -90 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.8, ease: 'power3.out' }, t1);
      tl.to(ring, { rotation: 70, duration: sEnd('intro') - t1, ease: 'none' }, t1 + 0.8);
      tl.fromTo(logo, { y: -60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, t1 + 0.1);
      tl.fromTo(sb, { y: 520, scale: 0.6, rotation: -12 }, { y: 0, scale: 1, rotation: 0, duration: 0.6, ease: 'back.out(1.5)' }, t1 + 0.05);
      bob(sb, t1 + 0.7, sEnd('intro'));
      tl.fromTo(hey, { scale: 3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2.2)' }, segs.s01.start);
      shake(segs.s01.start + 0.12, 14);
      pop(em, w('s01', 'Leute'), 0, 'back.out(2.6)', 0.4, 12);
      tl.to(em, { rotation: -14, duration: 0.18, yoyo: true, repeat: 5, ease: 'sine.inOut' }, w('s01', 'Leute') + 0.4);
      tl.fromTo(np, { x: -900 }, { x: 0, duration: 0.5, ease: 'power4.out' }, w('s01', 'Franz') - 0.1);
      tl.fromTo($('.r', np), { scaleX: 0, transformOrigin: 'left center' }, { scaleX: 1, duration: 0.35, ease: 'power3.out' }, w('s01', 'Fresh') - 0.05);
      burst(s, 540, 1220, w('s01', 'Fresh'));
    }

    // ===================== 2) COVER =====================
    {
      const s = scene('cover', 'orange');
      const heart = el('div', 'abs', `<svg width="1400" height="1400" viewBox="0 0 100 100"><path d="${heartPath}" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="7" stroke-linejoin="round"/></svg>`, s);
      css(heart, { left: '-160px', top: '120px' });
      const numText = $('text', bigNum(s, '27', '#fff', 0.4, 330, 980, 900));
      const persp = el('div', 'abs persp', null, s);
      const card = el('div', 'cover-card', null, persp);
      img(A + 'pages/cover.webp', '', card);
      const t1 = el('div', 'abs center-x title-xl', 'SEMINARE', s); t1.style.top = '1112px';
      const yr = el('div', 'abs y-marker', '2027', s); css(yr, { left: '640px', top: '1010px' });
      const da = el('div', 'abs sticker', 'SIND DA! 🔥', s); css(da, { left: '120px', top: '255px' });
      const at = sStart('cover') - 0.25;
      enter('cover', at, 'zoom');
      tl.fromTo(heart, { scale: 0.6, rotation: -20 }, { scale: 1, rotation: 6, duration: sEnd('cover') - at, ease: 'power1.out' }, at);
      tl.fromTo(numText, { strokeDasharray: 5200, strokeDashoffset: 5200 }, { strokeDashoffset: 0, duration: 2.2, ease: 'power2.inOut' }, at + 0.3);
      tl.fromTo(card, { rotationY: -80, rotationX: 18, x: -700, z: -500 }, { rotationY: 10, rotationX: 4, x: 0, z: 0, duration: 0.9, ease: 'power3.out' }, at + 0.15);
      tl.to(card, { rotationY: -8, rotationX: -3, duration: 2.4, ease: 'sine.inOut' }, at + 1.05);
      tl.fromTo(split(t1), { y: 160, opacity: 0, rotation: 12 }, { y: 0, opacity: 1, rotation: 0, duration: 0.45, stagger: 0.035, ease: 'back.out(2)' }, w('s02', 'Seminare') - 0.1);
      pop(yr, w('s02', '2027'), 0, 'back.out(2.4)', 0.4, -8);
      shake(w('s02', '2027') + 0.1, 12);
      pop(da, w('s02', 'sind') - 0.05, 0, 'back.out(3)', 0.4, -6);
      punch(w('s02', 'sind'));
      burst(s, 330, 300, w('s02', 'da'));
      tl.to(card, { scale: 3.2, opacity: 0, duration: 0.45, ease: 'power3.in' }, sEnd('cover') - 0.4);
    }

    // ===================== 3) MENSCHEN – ALSO: DU! =====================
    {
      const s = scene('menschen', 'white');
      bigNum(s, '!', '#5b6066', 0.12, 560, 640, 1100);
      const box = el('div', 'abs center-x', null, s); box.style.top = '470px';
      const l1 = el('div', 'kin', 'MENSCHEN', box); l1.style.fontSize = '182px';
      const l2 = el('div', 'kin', 'MACHEN DEN', box); css(l2, { fontSize: '92px', color: '#5b6066', margin: '14px 0' });
      const l3 = el('div', 'kin', 'UNTERSCHIED', box); l3.style.fontSize = '138px';
      const heart = el('div', 'abs', `<svg width="980" height="980" viewBox="0 0 100 100"><path d="${heartPath}" fill="none" stroke="#FCE531" stroke-width="9" stroke-linejoin="round"/></svg>`, s);
      css(heart, { left: '50px', top: '330px' });
      const du = el('div', 'abs center-x kin', 'DU!', s); css(du, { top: '560px', fontSize: '400px', color: 'var(--o)' });
      const point = emoji(s, '🫵', 70, 960, 230, -10);
      const sb = img(A + 'img/strong.webp', 'sb', s, { left: '640px', top: '980px', width: '400px' });
      const at = sStart('menschen') - 0.3;
      enter('menschen', at, 'wipe', 'o');
      tl.fromTo(l1, { scale: 2.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'power4.out' }, w('s03', 'Menschen') - 0.05);
      shake(w('s03', 'Menschen') + 0.18, 18);
      tl.fromTo(split(l2), { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.28, stagger: 0.022, ease: 'back.out(2)' }, w('s03', 'machen') - 0.05);
      tl.fromTo(l3, { x: 1100, skewX: -20 }, { x: 0, skewX: 0, duration: 0.42, ease: 'power4.out' }, w('s03', 'Unterschied') - 0.1);
      const tDu = w('s03', 'du');
      tl.to(box, { y: -260, scale: 0.55, opacity: 0.16, duration: 0.42, ease: 'power3.inOut' }, w('s03', 'Also') - 0.15);
      tl.fromTo(heart, { scale: 0, rotation: -30 }, { scale: 1, rotation: 0, duration: 0.55, ease: 'back.out(1.6)' }, tDu - 0.2);
      tl.fromTo(du, { scale: 0, rotation: -15 }, { scale: 1, rotation: 0, duration: 0.42, ease: 'back.out(2.5)' }, tDu - 0.08);
      shake(tDu + 0.12, 24); punch(tDu + 0.1, 1.06);
      tl.fromTo(sb, { x: 500, rotation: 30 }, { x: 0, rotation: -4, duration: 0.5, ease: 'back.out(1.5)' }, tDu);
      pop(point, tDu + 0.12, 0, 'back.out(3)', 0.4, -10);
      burst(s, 540, 700, tDu + 0.1, '#F3703A');
    }

    // ===================== 4) LEVEL =====================
    {
      const s = scene('level', 'slate');
      const title = el('div', 'abs center-x', 'DEIN LEVEL', s); css(title, { top: '170px', font: '900 150px/1 Outfit' });
      const sub = el('div', 'abs center-x', 'VOM EINSTEIGER ZUM EXPERTEN', s); css(sub, { top: '330px', font: '900 50px/1 Outfit', color: 'var(--o)' });
      const xp = el('div', 'abs xp', '<div class="xp-l">XP</div><div class="xp-bar"><div class="xp-fill"></div></div>', s);
      const fill = $('.xp-fill', xp);
      const names = ['FRESH-LING', 'FRESH-KRAFT', 'FRESH-ALIST', 'FRESH-MASTER'];
      const words = ['Fresh-ling', 'Fresh-Kraft', 'Fresh-Alist', 'Fresh-Master'];
      const rows = names.map((n, i) => {
        const r = el('div', 'lvl', `<div class="hearts">${[0, 1, 2, 3].map((k) => heartSVG(k <= i)).join('')}</div><div class="lbl">${n}</div>`, s);
        css(r, { left: 0, top: 1140 - i * 185 + 'px', width: 470 + i * 150 + 'px' });
        return r;
      });
      const think = img(A + 'img/think.webp', 'sb', s, { left: '700px', top: '1010px', width: '250px' });
      const king = img(A + 'img/king.webp', 'sb', s, { left: '640px', top: '1030px', width: '330px' });
      const tagQ = el('div', 'abs tag', 'QUEREINSTEIGER', s); css(tagQ, { left: '70px', top: '1328px', rotate: '-3deg' });
      const tagP = el('div', 'abs tag', 'PROFI', s); css(tagP, { left: '820px', top: '505px', rotate: '4deg' });
      const up = el('div', 'abs levelup', 'LEVEL UP! 🚀', s); css(up, { left: '410px', top: '760px' });
      const at = sStart('level') - 0.3;
      enter('level', at, 'whip');
      tl.fromTo(split(title), { y: -140, opacity: 0 }, { y: 0, opacity: 1, duration: 0.42, stagger: 0.03, ease: 'back.out(2)' }, at + 0.3);
      tl.fromTo(sub, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.35 }, at + 0.65);
      tl.fromTo(xp, { scaleX: 0 }, { scaleX: 1, duration: 0.4, ease: 'power3.out' }, at + 0.7);
      pop(think, at + 0.6, 0, 'back.out(2)', 0.45);
      rows.forEach((r, i) => {
        const t = w('s04', words[i]) - 0.12;
        tl.fromTo(r, { x: -1000 }, { x: 0, duration: 0.42, ease: 'power4.out' }, t);
        tl.fromTo(r.querySelectorAll('svg'), { scale: 0 }, { scale: 1, duration: 0.28, stagger: 0.05, ease: 'back.out(3)' }, t + 0.16);
        tl.to(fill, { width: (i + 1) * 25 + '%', duration: 0.35, ease: 'power2.out' }, t + 0.1);
        sparkle(s, 980, 395, 70, t + 0.3);
      });
      tl.fromTo(tagQ, { scale: 0 }, { scale: 1, duration: 0.32, ease: 'back.out(2.5)' }, w('s05', 'Quereinsteiger') - 0.05);
      tl.fromTo(tagP, { scale: 0 }, { scale: 1, duration: 0.32, ease: 'back.out(2.5)' }, w('s05', 'Profi') - 0.05);
      tl.to(think, { scale: 0, duration: 0.2, ease: 'power2.in' }, w('s05', 'Profi') - 0.1);
      pop(king, w('s05', 'Profi') + 0.06, 0, 'back.out(2)', 0.45);
      const tUp = w('s05', 'levelst');
      tl.fromTo(up, { scale: 0, rotation: -30 }, { scale: 1, rotation: -7, duration: 0.4, ease: 'back.out(3)' }, tUp - 0.08);
      shake(tUp + 0.1, 14); punch(tUp + 0.05);
      burst(s, 640, 800, tUp);
      tl.to(rows[3], { scale: 1.06, transformOrigin: 'left center', duration: 0.2, yoyo: true, repeat: 3, ease: 'sine.inOut' }, tUp);
    }

    // ===================== 5–11) THEMEN =====================
    // cue = Wort im Antwortsatz, auf dem die Karte reinfliegt (ohne cue: wird dazwischen verteilt)
    const CATS = [
      { scene: 'onboarding', q: ['WAS GIBT\'S FÜR DEN', 'START'], name: 'ONBOARDING', sub: '& GRUNDLAGEN', bg: 'white', num: '1', tr: 'iris',
        emoji: '🚀', hero: ['img/cool.webp', 360], band: 'LOS GEHT\'S',
        cards: [['01', 'Onboarding'], ['02'], ['03', 'Grundlagen'], ['04', 'Heimspielserie']],
        food: [['img/petersilie', -40, 1060, 300], ['food/p05_308', 790, 470, 280]] },
      { scene: 'fleisch', q: ['WAS GIBT\'S RUND UM', 'FLEISCH'], name: 'FLEISCH', bg: 'slate', num: '2', tr: 'whip',
        emoji: '🥩', hero: ['food/p05_364', 600], band: 'FLEISCH',
        cards: [['05', 'Fleisch'], ['06', 'Grillschule'], ['07', 'Bratenschule'], ['08'], ['09'], ['10', 'Meat']],
        food: [['food/p05_364', -70, 1040, 420], ['food/p17_1098', 800, 430, 250], ['food/p40_2084', 760, 1090, 330]] },
      { scene: 'wurst', q: ['UND BEI', 'WURST'], name: 'WURST', bg: 'orange', num: '3', tr: 'wipe',
        emoji: '🥓', hero: ['food/p20_1257', 560], band: 'WURST',
        cards: [['11', 'Feine'], ['13'], ['12', 'Food']],
        food: [['food/p20_1257', -60, 1080, 400], ['food/p03_145', 830, 420, 230], ['food/p18_1139', 740, 1100, 360]] },
      { scene: 'kaese', q: ['WAS GEHT BEIM', 'KÄSE'], name: 'KÄSE', bg: 'white', num: '4', tr: 'zoom',
        emoji: '🧀', hero: ['food/p24_1408', 560], band: 'KÄSE',
        cards: [['14', 'Kulinarische'], ['15', 'Fromage'], ['16'], ['17'], ['18', 'Masterclass']],
        food: [['food/p21_1277', -50, 1070, 360], ['food/p24_1408', 790, 430, 260], ['food/p35_1829', 760, 1110, 330]] },
      { scene: 'fisch', q: ['WAS GIBT\'S RUND UM', 'FISCH'], name: 'FISCH', bg: 'blue', num: '5', tr: 'whip',
        emoji: '🐟', hero: ['food/p26_1450', 640], band: 'FISCH',
        cards: [['19', 'Rock'], ['20'], ['21', 'hautnah']],
        food: [['food/p26_1450', -80, 1090, 460], ['food/p38_1906', 820, 420, 220]] },
      { scene: 'fuehrung', q: ['IHR WOLLT', 'FÜHREN'], name: 'FÜHRUNG', sub: '& MANAGEMENT', bg: 'orange', num: '6', tr: 'wipe',
        emoji: '💪', hero: ['img/strong.webp', 400], band: 'FÜHRUNG',
        cards: [['22', 'Führungstraining'], ['23', 'eins'], ['24', 'drei'], ['26', 'Ausbilderschein'], ['27'], ['25', 'Meisterpflicht'], ['28'], ['29'], ['30'], ['31']],
        food: [['food/p29_1556', 800, 1060, 250]] },
      { scene: 'azubis', q: ['UND IHR', 'AZUBIS'], name: 'AUSBILDUNG', sub: '& WEITERBILDUNG', bg: 'slate', num: '7', tr: 'zoom', pages: true,
        emoji: '🔥', hero: ['img/peace.webp', 380], band: 'THEKENZEIT',
        cards: [['32', 'Thekenzeit'], ['33', 'Hands'], ['34', 'Handwerk'], ['35']],
        food: [] },
    ];
    const OPAQUE = ['24', '29', '30', '31'];
    const theme = {
      white: { label: ['var(--o)', '#fff'], name: 'var(--o)', sub: 'var(--g)', q1: 'var(--ink)', q2: 'var(--o)', num: ['#5b6066', 0.13], bandA: ['var(--y)', 'var(--b)'], bandB: ['var(--b)', 'var(--y)'] },
      slate: { label: ['var(--o)', '#fff'], name: '#fff', sub: 'var(--o)', q1: 'var(--y)', q2: '#fff', num: ['#fff', 0.22], bandA: ['var(--y)', 'var(--b)'], bandB: ['var(--o)', '#fff'] },
      orange: { label: ['#fff', 'var(--o)'], name: '#fff', sub: 'var(--ink)', q1: 'var(--ink)', q2: '#fff', num: ['#fff', 0.25], bandA: ['var(--y)', 'var(--b)'], bandB: ['var(--b)', 'var(--y)'] },
      blue: { label: ['var(--y)', 'var(--b)'], name: '#fff', sub: 'var(--y)', q1: 'var(--y)', q2: '#fff', num: ['#fff', 0.2], bandA: ['var(--y)', 'var(--b)'], bandB: ['#fff', 'var(--b)'] },
    };

    CATS.forEach((c, ci) => {
      const s = scene(c.scene, c.bg);
      const th = theme[c.bg];
      const [qs, as] = segsOf(c.scene);
      const at = sStart(c.scene) - 0.3;
      const end = sEnd(c.scene);
      const tA = as.start; // Antwort beginnt
      bigNum(s, c.num, th.num[0], th.num[1], 470, 760, 1150);

      // --- Frage-Beat ---
      const bA = band(s, c.band, 850, -7, th.bandA[0], th.bandA[1], at, end, 1);
      const bB = band(s, c.band, 1215, 5, th.bandB[0], th.bandB[1], at, end, -1);
      const heroIsSb = c.hero[0].startsWith('img/');
      const hero = img(A + c.hero[0] + (c.hero[0].endsWith('.webp') ? '' : '.webp'), heroIsSb ? 'sb' : 'food', s, { left: 540 - c.hero[1] / 2 + 'px', top: '880px', width: c.hero[1] + 'px' });
      const qg = el('div', 'abs center-x qgroup', null, s); qg.style.top = '470px';
      const q1 = el('div', 'q1', c.q[0], qg); q1.style.color = th.q1;
      const qw = el('div', 'q2', null, qg);
      const qword = el('span', '', c.q[1], qw); qword.style.color = th.q2;
      el('span', 'qmark', '?', qw);
      qw.style.fontSize = Math.min(250, Math.floor(900 / ((c.q[1].length + 0.6) * 0.7))) + 'px';
      const em = emoji(s, c.emoji, 830, 255, 170, 14);

      tl.fromTo([bA, bB], { scaleX: 0 }, { scaleX: 1, duration: 0.45, ease: 'power3.out', stagger: 0.08 }, at + 0.2);
      tl.fromTo(split(q1), { y: -80, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.015, ease: 'back.out(2)' }, qs.start - 0.1);
      tl.fromTo(qw, { scale: 2.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'expo.out' }, qs.start + 0.1);
      scramble(qword, qs.start + 0.1, 0.4);
      shake(qs.start + 0.35, 16); punch(qs.start + 0.3);
      tl.fromTo($('.qmark', qw), { rotation: -60, scale: 0 }, { rotation: 10, scale: 1, duration: 0.4, ease: 'back.out(3)' }, qs.start + 0.35);
      pop(em, qs.start + 0.3, 0, 'back.out(3)', 0.4, 14);
      tl.fromTo(hero, { y: 700, rotation: -25, scale: 0.6 }, { y: 0, rotation: 0, scale: 1, duration: 0.55, ease: 'back.out(1.4)' }, at + 0.25);
      tl.to(hero, { rotation: 5, y: -20, duration: Math.max(0.3, tA - at - 0.8), ease: 'sine.inOut' }, at + 0.8);
      // Frage raus, Bänder gedimmt
      const tOut = tA - 0.15;
      tl.to(qg, { y: -420, scale: 0.5, opacity: 0, duration: 0.35, ease: 'power3.in' }, tOut);
      tl.to(hero, { y: 1300, rotation: 30, opacity: 0, duration: 0.4, ease: 'power3.in' }, tOut);
      tl.to(em, { scale: 0, duration: 0.25, ease: 'power2.in' }, tOut);
      tl.to([bA, bB], { opacity: 0.28, duration: 0.4 }, tOut);

      // --- Antwort: Kopfzeile + Karten ---
      const light = c.bg === 'white';
      const label = el('div', 'abs cat-label', `THEMA ${ci + 1}/${CATS.length}`, s); css(label, { background: th.label[0], color: th.label[1] });
      const count = el('div', 'abs cat-count', `${c.cards.length} Seminare`, s); if (c.bg === 'blue') count.style.color = 'var(--y)';
      const nm = el('div', 'abs cat-name', c.name, s);
      const fs = Math.min(230, Math.floor(960 / (c.name.length * 0.7)));
      css(nm, { fontSize: fs + 'px', color: th.name });
      let subEl;
      if (c.sub) { subEl = el('div', 'abs cat-sub', c.sub, s); css(subEl, { top: 270 + fs * 0.98 + 'px', color: th.sub }); }
      tl.fromTo(label, { x: -500 }, { x: 0, duration: 0.35, ease: 'power3.out' }, tA);
      tl.fromTo(split(nm), { y: 200, opacity: 0, rotation: 14 }, { y: 0, opacity: 1, rotation: 0, duration: 0.42, stagger: 0.03, ease: 'back.out(1.9)' }, tA - 0.05);
      if (subEl) tl.fromTo(subEl, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.4, ease: 'power3.out' }, tA + 0.3);
      pop(count, tA + 0.35, 0, 'back.out(2.4)', 0.4, -5);

      // Zeitpunkte der Karten: auf dem genannten Wort, Rest dazwischen verteilt
      const times = c.cards.map(([, cue]) => (cue ? Math.max(tA + 0.05, w(as.id, cue) - 0.15) : null));
      if (times[0] == null) times[0] = tA + 0.1;
      for (let i = 1; i < times.length; i++) {
        if (times[i] != null) continue;
        let j = i; while (j < times.length && times[j] == null) j++;
        const a = times[i - 1];
        const b = j < times.length ? times[j] : Math.max(a + 0.5 * (j - i + 1), end - 0.45);
        for (let k = i; k < j; k++) times[k] = a + ((b - a) * (k - i + 1)) / (j - i + 1);
      }
      for (let i = 1; i < times.length; i++) times[i] = Math.max(times[i], times[i - 1] + 0.28);

      const cards = c.cards.map(([nr]) => {
        const k = el('div', `card ${c.pages ? 'page' : ''} ${OPAQUE.includes(nr) ? 'opaque' : ''}`, null, s);
        img(A + (c.pages ? `pages/${nr}.webp` : `titles/${nr}.webp`), '', k);
        el('div', 'nr', nr, k);
        return k;
      });
      const pose = cards.map(() => ({ x: rr(-16, 16), r: rr(-4, 4) }));
      cards.forEach((k, i) => {
        const t = times[i];
        const v = i % 3;
        tl.set(k, { visibility: 'visible' }, t);
        if (v === 0) tl.fromTo(k, { x: 1150, y: 60, rotation: 22, skewX: -10 }, { x: pose[i].x, y: 0, rotation: pose[i].r, skewX: 0, duration: 0.45, ease: 'expo.out' }, t);
        else if (v === 1) tl.fromTo(k, { y: 900, rotationX: -70, rotation: -10, transformPerspective: 1400 }, { y: 0, rotationX: 0, rotation: pose[i].r, x: pose[i].x, duration: 0.5, ease: 'expo.out' }, t);
        else tl.fromTo(k, { scale: 0.2, rotation: -40, x: pose[i].x }, { scale: 1, rotation: pose[i].r, duration: 0.45, ease: 'back.out(1.8)' }, t);
        sparkle(s, 860 + rr(-30, 30), 600 + rr(-20, 20), 80, t + 0.18);
        if (i % 2 === 0) punch(t + 0.12, 1.02);
        for (let j = i + 1; j < cards.length; j++) {
          const d = j - i;
          tl.to(k, { y: -36 * d, scale: 1 - 0.05 * d, opacity: d > 3 ? 0 : 1 - 0.12 * d, duration: 0.35, ease: 'power3.out' }, times[j] + 0.05);
        }
      });
      c.food.forEach(([f, x, y, wd], i) => {
        const fi = img(A + f + '.webp', 'food', s, { left: x + 'px', top: y + 'px', width: wd + 'px' });
        tl.fromTo(fi, { scale: 0, rotation: -35 + i * 25 }, { scale: 1, rotation: 0, duration: 0.55, ease: 'back.out(1.7)' }, tA + 0.25 + i * 0.18);
        tl.to(fi, { rotation: i % 2 ? 6 : -6, y: i % 2 ? -18 : 18, duration: Math.max(0.5, end - tA - 1), ease: 'sine.inOut' }, tA + 0.8);
      });
      enter(c.scene, at, c.tr, ci % 2 ? 'w' : '');
    });

    // ===================== 12) FRESH DIGITAL =====================
    {
      const s = scene('digital', 'slate');
      const [qs, as] = segsOf('digital');
      const at = sStart('digital') - 0.3;
      const qg = el('div', 'abs center-x qgroup', null, s); qg.style.top = '620px';
      const q1 = el('div', 'q2', 'UND', qg); css(q1, { fontSize: '150px', color: 'var(--y)' });
      const q2 = el('div', 'q2', 'ZWISCHEN-<br>DURCH<span class="qmark">?</span>', qg); css(q2, { fontSize: '170px', color: '#fff' });
      const em = emoji(s, '📱', 760, 430, 200, 12);
      const logo = img(A + 'img/fresh-digital.webp', 'abs', s, { left: '150px', top: '170px', width: '780px' });
      const neu = el('div', 'abs sticker', 'NEU!', s); css(neu, { left: '60px', top: '150px' });
      const tiles = [
        `<img class="art" src="${A}img/100-handgriffe.webp"><div><div class="big"><span class="cnt">0</span></div><div class="t1">HANDGRIFFE</div><div class="t2">als Video – kurz &amp; direkt aus der Praxis</div></div>`,
        `<img class="art" src="${A}img/edeka-nx.webp" style="height:150px;border-radius:24px"><div><div class="t1">BLENDED<br>LEARNING</div><div class="t2">Wissen, das zu dir passt</div></div>`,
        `<div class="wizz">Wizz<br>Up!</div><div><div class="t1">QUIZ-DUELL</div><div class="t2">Lernen. Spielen.<br>Wissen pushen!</div></div>`,
      ].map((h, i) => { const t = el('div', 'tile', h, s); t.style.top = 560 + i * 265 + 'px'; return t; });
      const cnt = $('.cnt', tiles[0]);
      const sb = img(A + 'img/cool.webp', 'sb', s, { left: '790px', top: '1180px', width: '220px' });
      enter('digital', at, 'whip');
      tl.fromTo(q1, { x: -900 }, { x: 0, duration: 0.35, ease: 'expo.out' }, qs.start - 0.1);
      tl.fromTo(q2, { scale: 2.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.32, ease: 'expo.out' }, qs.start + 0.15);
      shake(qs.start + 0.4, 14);
      pop(em, qs.start + 0.3, 0, 'back.out(3)', 0.4, 12);
      tl.to(em, { rotation: -10, duration: 0.12, yoyo: true, repeat: 5, ease: 'sine.inOut' }, qs.start + 0.7);
      const tA = as.start;
      tl.to(qg, { y: -500, scale: 0.5, opacity: 0, duration: 0.32, ease: 'power3.in' }, tA - 0.2);
      tl.to(em, { scale: 0, duration: 0.2 }, tA - 0.2);
      tl.fromTo(logo, { scale: 3, opacity: 0, rotation: -8 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'power4.out' }, tA - 0.05);
      shake(tA + 0.2, 20);
      pop(neu, tA + 0.3, 0, 'back.out(3)', 0.4, -10);
      const tw = [w(as.id, '100'), w(as.id, 'Blended'), w(as.id, 'WizzUp')];
      tiles.forEach((t, i) => {
        tl.fromTo(t, { x: i % 2 ? 1100 : -1100, rotation: i % 2 ? 6 : -6, skewX: i % 2 ? 12 : -12 }, { x: 0, rotation: 0, skewX: 0, duration: 0.45, ease: 'expo.out' }, Math.max(tA + 0.1, tw[i] - 0.18));
        sparkle(s, 900, 540 + i * 265, 70, tw[i] + 0.15);
      });
      const o = { v: 0 };
      tl.to(o, { v: 100, duration: 0.9, ease: 'power2.out', onUpdate: () => { cnt.textContent = Math.round(o.v); } }, tw[0]);
      tl.fromTo($('.wizz', tiles[2]), { scale: 0.3, rotation: -30 }, { scale: 1, rotation: -4, duration: 0.45, ease: 'back.out(3)' }, tw[2] + 0.05);
      tl.fromTo(sb, { y: 900 }, { y: 0, duration: 0.45, ease: 'back.out(1.6)' }, w(as.id, 'Quiz') - 0.1);
    }

    // ===================== 13) SHARE – Bock drauf? =====================
    {
      const s = scene('share', 'blue');
      const seg = segsOf('share')[0];
      const at = sStart('share') - 0.3;
      band(s, 'BOCK DRAUF', 220, -6, 'var(--y)', 'var(--b)', at, sEnd('share'), 1).style.opacity = 0.9;
      const bock = el('div', 'abs center-x', null, s); css(bock, { top: '440px', font: '900 230px/.88 Outfit', color: 'var(--y)' });
      const bk1 = el('div', '', 'BOCK', bock); const bk2 = el('div', '', 'DRAUF?', bock);
      const l1 = el('div', 'abs center-x', 'SCHICK DAS DEINER', s); css(l1, { top: '930px', font: '900 70px/1 Outfit', color: '#fff' });
      const l2 = el('div', 'abs center-x', 'MARKTLEITUNG!', s); css(l2, { top: '1015px', font: '900 128px/1 Outfit', color: 'var(--y)' });
      const trail = el('div', 'abs', `<svg width="1080" height="1920"><path d="M-40 1330 C 260 1250, 330 1060, 560 1120 S 900 980, 1130 760" fill="none" stroke="#fff" stroke-width="9" stroke-dasharray="4 26" stroke-linecap="round" stroke-opacity=".75"/></svg>`, s);
      css(trail, { left: 0, top: 0 });
      const plane = el('div', 'abs', `<svg viewBox="0 0 100 100" width="190" height="190"><path d="M8 46 L92 10 L66 90 L50 58 Z" fill="#fff" stroke="#fff" stroke-width="5" stroke-linejoin="round"/><path d="M50 58 L92 10" stroke="var(--b)" stroke-width="6"/></svg>`, s);
      css(plane, { left: '-200px', top: '1240px' });
      const sb = img(A + 'img/please.webp', 'sb', s, { left: '50px', top: '1120px', width: '230px' });
      enter('share', at, 'iris');
      tl.fromTo([...split(bk1), ...split(bk2)], { y: 200, opacity: 0, rotation: 15 }, { y: 0, opacity: 1, rotation: 0, duration: 0.4, stagger: 0.04, ease: 'back.out(2)' }, seg.start - 0.1);
      shake(w(seg.id, 'drauf') + 0.1, 18); punch(w(seg.id, 'drauf'));
      tl.to(bock, { scale: 0.62, y: -180, duration: 0.35, ease: 'power3.inOut' }, w(seg.id, 'Schick') - 0.2);
      tl.fromTo(l1, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power3.out' }, w(seg.id, 'Schick') - 0.1);
      tl.fromTo(l2, { scale: 0, rotation: -8 }, { scale: 1, rotation: -3, duration: 0.4, ease: 'back.out(2.5)' }, w(seg.id, 'Marktleitung') - 0.1);
      tl.fromTo(trail, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1.1, ease: 'power2.inOut' }, w(seg.id, 'Schick'));
      tl.fromTo(plane, { x: 0, y: 0, rotation: 10 }, { x: 1350, y: -560, rotation: -20, duration: 1.1, ease: 'power2.inOut' }, w(seg.id, 'Schick'));
      tl.fromTo(sb, { y: 950 }, { y: 0, duration: 0.45, ease: 'back.out(1.6)' }, w(seg.id, 'Marktleitung'));
      burst(s, 540, 1080, w(seg.id, 'Marktleitung') + 0.2);
    }

    // ===================== 14) APP – Link in Bio =====================
    {
      const s = scene('app', 'orange');
      const seg = segsOf('app')[0];
      const at = sStart('app') - 0.3;
      const hearts = [];
      for (let i = 0; i < 14; i++) {
        const h = el('div', 'abs', `<svg viewBox="0 0 100 100" width="100%" height="100%"><path d="${heartPath}" fill="none" stroke="#fff" stroke-opacity="${rr(0.15, 0.4).toFixed(2)}" stroke-width="10" stroke-linejoin="round"/></svg>`, s);
        const size = rr(60, 170);
        css(h, { left: rr(-40, 1000) + 'px', top: '1950px', width: size + 'px', height: size + 'px' });
        hearts.push(h);
      }
      const head = el('div', 'abs center-x', 'ALLE SEMINARE<br><span style="color:var(--ink)">IN DER APP</span>', s);
      css(head, { top: '150px', font: '900 104px/1 Outfit' });
      const phone = el('div', 'abs phone', `<div class="screen"><img src="${A}img/app-screen.webp"></div><div class="notch"></div>`, s);
      const bio = el('div', 'abs sticker big', 'LINK IN BIO 👆', s); css(bio, { left: '150px', top: '1150px' });
      const sb = img(A + 'img/love.webp', 'sb', s, { left: '770px', top: '960px', width: '290px' });
      const end = el('div', 'abs endcard', `<img src="${A}img/food-academy-fresh-logo.svg"><div class="handle">@edeka_foodacademy</div><div class="see">WIR SEHEN UNS<br>AN DER THEKE! <span class="emo">🧡</span></div>`, s);
      enter('app', at, 'whip');
      hearts.forEach((h) => tl.to(h, { y: -2300, rotation: rr(-60, 60), duration: rr(4, 7), ease: 'none' }, at + rr(0, 4)));
      tl.fromTo(head, { y: -300, opacity: 0 }, { y: 0, opacity: 1, duration: 0.42, ease: 'back.out(1.8)' }, seg.start - 0.1);
      tl.fromTo(phone, { y: 1700, rotation: 12 }, { y: 0, rotation: -3, duration: 0.6, ease: 'expo.out' }, w(seg.id, 'App') - 0.3);
      tl.to($('.screen img', phone), { y: -60, duration: 2.0, ease: 'sine.inOut' }, w(seg.id, 'App') + 0.4);
      tl.fromTo(bio, { scale: 0, rotation: -30 }, { scale: 1, rotation: -6, duration: 0.4, ease: 'back.out(3)' }, w(seg.id, 'Link') - 0.1);
      shake(w(seg.id, 'Link') + 0.1, 14); punch(w(seg.id, 'Link'));
      burst(s, 540, 1180, w(seg.id, 'Bio'));
      tl.to($('.emoji-in', bio) || bio, { y: -10, duration: 0.15, yoyo: true, repeat: 7, ease: 'sine.inOut' }, w(seg.id, 'Bio') + 0.3);
      tl.fromTo(sb, { x: 400, rotation: 25 }, { x: 0, rotation: -6, duration: 0.5, ease: 'back.out(1.6)' }, w(seg.id, 'Link') + 0.2);
      // Endcard
      const tE = w(seg.id, 'Wir') - 0.15;
      tl.to([head, phone, bio, sb], { opacity: 0, scale: 0.8, y: '-=60', duration: 0.35, ease: 'power3.in', stagger: 0.03 }, tE);
      tl.fromTo(end, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.8)' }, tE + 0.25);
      tl.fromTo($('.see', end), { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'back.out(2)' }, w(seg.id, 'Theke') - 0.3);
      burst(s, 540, 700, w(seg.id, 'Theke'));
      tl.to($('.emo', end), { scale: 1.3, duration: 0.3, yoyo: true, repeat: 5, ease: 'sine.inOut' }, seg.end);
    }

    tl.set({}, {}, T.total);
  }

  // =====================================================================
  // Film-Korn (deterministisch, ändert sich pro Bild)
  // =====================================================================
  const grain = el('div', 'grain', null, stage);
  {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'); const d = g.createImageData(256, 256); const r = makeRng(7);
    for (let i = 0; i < d.data.length; i += 4) { const v = r() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0);
    grain.style.backgroundImage = `url(${c.toDataURL()})`;
  }

  // =====================================================================
  // Untertitel: 1–3 Wörter, aktives Wort gelb + Pop
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
      if (cur.length && (len > 16 || cur.length >= 3)) flush();
      cur.push(wd);
      if (/[.!?:,–]$/.test(wd.w)) flush();
    });
    flush();
  });
  chunks.forEach((c, i) => {
    c.start = c[0].s;
    const next = chunks[i + 1];
    c.end = Math.min(c[c.length - 1].e + 0.45, next ? next[0].s : Infinity);
  });
  let shown = null;
  function renderSubs(t) {
    const c = chunks.find((x) => t >= x.start - 0.02 && t < x.end);
    if (c !== shown) {
      shown = c;
      const html = c ? c.map((x) => `<span class="w">${x.w.replace(/–/g, '')}</span>`).join(' ') : '';
      subsBack.innerHTML = html; subsFront.innerHTML = html;
    }
    if (!c) return;
    c.forEach((x, i) => {
      const on = t >= x.s && (i === c.length - 1 || t < c[i + 1].s);
      const k = Math.min(1, Math.max(0, (t - x.s) / 0.16));
      const sc = on ? 1 + 0.16 * Math.sin(Math.PI * k) : 1;
      const rot = on ? -3 * Math.sin(Math.PI * k) : 0;
      [subsBack.children[i], subsFront.children[i]].forEach((sp) => { sp.classList.toggle('on', on); sp.style.transform = `scale(${sc}) rotate(${rot}deg)`; });
    });
    const k = Math.min(1, (t - c.start) / 0.14);
    subsEl.style.transform = `scale(${0.75 + 0.25 * (1 - Math.pow(1 - k, 3))})`;
  }

  // =====================================================================
  // Steuerung
  // =====================================================================
  function seek(t) {
    tl.time(Math.min(t, T.total), false);
    renderSubs(t);
    const f = Math.round(t * T.fps);
    grain.style.backgroundPosition = `${(f * 73) % 256}px ${(f * 151) % 256}px`;
  }
  window.__seek = seek;
  window.__total = T.total;
  window.__fps = T.fps;
  window.__ready = (async () => {
    await document.fonts.ready;
    await Promise.all(['900 40px Outfit', '800 40px Outfit', '600 40px Outfit', '40px Marker', '40px "Noto Color Emoji"'].map((f) => document.fonts.load(f, '🔥A')));
    build();
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
