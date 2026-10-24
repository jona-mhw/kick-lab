/* KICK LAB · componentes de interfaz: perillas, selectores, cadena de señal y pantallas */
(function () {
  'use strict';
  const KL = (window.KL = window.KL || {});
  const ui = (KL.ui = {});
  const D = () => KL.dsp;
  const LIME = '#C3E298', AQUA = '#BFEFE6', TEAL = '#008089', DEEP = '#026168';

  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  ui.h = h;

  /* ---------- formato de valores ---------- */
  ui.fmt = function (p, v) {
    if (p.u === 'Hz' && v >= 1000) return (v / 1000).toFixed(v >= 10000 ? 1 : 2) + ' kHz';
    const d = p.d != null ? p.d : 1;
    let s = (+v).toFixed(d).replace('.', ',');
    if (p.min < 0 && v > 0.0001 && (p.u === 'dB' || p.u === '¢')) s = '+' + s;
    return s + (p.u ? (p.u.startsWith('%') || p.u === '¢' || p.u === ':1' || p.u === '×' ? '' : ' ') + p.u : '');
  };

  /* ---------- perilla giratoria: arrastre vertical, rueda, doble clic = valor inicial ---------- */
  const A0 = -135, A1 = 135;
  const toN = (p, v) => p.sc === 'log' ? Math.log(v / p.min) / Math.log(p.max / p.min) : p.sc === 'pow' ? Math.sqrt((v - p.min) / (p.max - p.min)) : (v - p.min) / (p.max - p.min);
  const fromN = (p, n) => { n = Math.min(1, Math.max(0, n)); return p.sc === 'log' ? p.min * Math.pow(p.max / p.min, n) : p.sc === 'pow' ? p.min + (p.max - p.min) * n * n : p.min + (p.max - p.min) * n; };
  ui.toN = toN; ui.fromN = fromN;
  const pt = (r, a) => { const rad = (a * Math.PI) / 180; return [50 + r * Math.sin(rad), 50 - r * Math.cos(rad)]; };
  function arc(r, a, b) {
    if (b - a < 0.01) return '';
    const [x0, y0] = pt(r, a), [x1, y1] = pt(r, b);
    return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${b - a > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }

  ui.knob = function (p, value, onChange, opts) {
    opts = opts || {};
    const el = h('div', 'knob' + (opts.small ? ' knob-s' : ''));
    el.tabIndex = 0;
    el.setAttribute('role', 'slider');
    el.setAttribute('aria-label', p.l);
    const ticks = Array.from({ length: 11 }, (_, i) => { const a = A0 + (i * (A1 - A0)) / 10, [x0, y0] = pt(44.5, a), [x1, y1] = pt(48.5, a); return `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}"/>`; }).join('');
    const sug = p.sug ? arc(41, A0 + toN(p, p.sug[0]) * 270, A0 + toN(p, p.sug[1]) * 270) : '';
    el.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true">
      <defs><radialGradient id="kb" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#3a4446"/><stop offset=".55" stop-color="#1b2223"/><stop offset="1" stop-color="#0c1011"/></radialGradient></defs>
      <g class="kt">${ticks}</g>
      <path class="k-track" d="${arc(37, A0, A1)}"/>
      <path class="k-sug" d="${sug}"/>
      <path class="k-val" d=""/>
      <circle cx="50" cy="50" r="27" fill="url(#kb)" class="k-body"/>
      <circle cx="50" cy="50" r="27" class="k-rim"/>
      <line class="k-ptr" x1="50" y1="50" x2="50" y2="28"/>
    </svg><div class="kv"></div><div class="kl">${p.l}</div>`;
    const val = el.querySelector('.k-val'), ptr = el.querySelector('.k-ptr'), kv = el.querySelector('.kv');
    let v = value;
    const bip = p.min < 0 && p.max > 0;
    function draw() {
      const n = toN(p, v), a = A0 + n * 270;
      const a0 = bip ? A0 + toN(p, 0) * 270 : A0;
      val.setAttribute('d', a >= a0 ? arc(37, a0, a) : arc(37, a, a0));
      const [x, y] = pt(23, a), [x0, y0] = pt(9, a);
      ptr.setAttribute('x1', x0); ptr.setAttribute('y1', y0); ptr.setAttribute('x2', x); ptr.setAttribute('y2', y);
      kv.innerHTML = ui.fmt(p, v) + (p.note ? `<small>${D().freqToNote(v).name}</small>` : '');
      el.setAttribute('aria-valuetext', ui.fmt(p, v));
      const inSug = p.sug && v >= p.sug[0] - 1e-9 && v <= p.sug[1] + 1e-9;
      el.classList.toggle('in-sug', !!inSug);
    }
    function set(nv, fire) {
      nv = Math.min(p.max, Math.max(p.min, nv));
      if (p.step) nv = Math.round(nv / p.step) * p.step;
      if (nv === v) return;
      v = nv; draw();
      if (fire !== false) onChange(v);
    }
    let sy = 0, sx = 0, sn = 0, drag = false;
    el.addEventListener('pointerdown', (e) => {
      drag = true; sy = e.clientY; sx = e.clientX; sn = toN(p, v);
      el.setPointerCapture(e.pointerId); el.classList.add('drag'); e.preventDefault();
    });
    el.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const k = e.shiftKey ? 900 : e.pointerType === 'touch' ? 260 : 200;
      set(fromN(p, sn + (sy - e.clientY + (e.clientX - sx) * 0.35) / k));
    });
    const end = () => { drag = false; el.classList.remove('drag'); };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.addEventListener('wheel', (e) => { e.preventDefault(); set(fromN(p, toN(p, v) - Math.sign(e.deltaY) * (e.shiftKey ? 0.004 : 0.02))); }, { passive: false });
    el.addEventListener('dblclick', () => set(p.def));
    el.addEventListener('keydown', (e) => {
      const st = e.shiftKey ? 0.004 : 0.02;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { set(fromN(p, toN(p, v) + st)); e.preventDefault(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { set(fromN(p, toN(p, v) - st)); e.preventDefault(); }
    });
    draw();
    return { el, set: (x) => set(x, false), get: () => v };
  };

  /* ---------- selector segmentado ---------- */
  const WAVE_ICON = {
    sine: 'M2 12 C6 2 10 2 12 12 S18 22 22 12', tri: 'M2 12 L7 3 L17 21 L22 12', saw: 'M2 18 L12 4 L12 18 L22 4 L22 12',
    square: 'M2 12 L2 4 L12 4 L12 20 L22 20 L22 12', noise: 'M2 12 L4 6 L6 16 L8 8 L10 19 L12 5 L14 15 L16 9 L18 18 L20 7 L22 12',
  };
  ui.seg = function (p, value, onChange, icons) {
    const el = h('div', 'seg');
    el.appendChild(h('div', 'seg-l', p.l));
    const row = h('div', 'seg-row');
    const btns = p.opts.map(([k, lab]) => {
      const b = h('button', 'seg-b', (icons && WAVE_ICON[k] ? `<svg viewBox="0 0 24 24"><path d="${WAVE_ICON[k]}"/></svg>` : '') + `<span>${lab}</span>`);
      b.type = 'button';
      b.onclick = () => { set(k); onChange(k); };
      row.appendChild(b);
      return [k, b];
    });
    el.appendChild(row);
    function set(k) { btns.forEach(([kk, b]) => b.classList.toggle('on', kk === k)); }
    set(value);
    return { el, set };
  };

  /* ---------- selector de tonalidad (teclado de una octava) ---------- */
  ui.keys = function (p, value, onChange) {
    const el = h('div', 'keysel');
    el.appendChild(h('div', 'seg-l', p.l));
    const kb = h('div', 'kb');
    const btns = KL.KEYS.map((name, i) => {
      const b = h('button', 'key ' + (name.includes('#') ? 'blk' : 'wht'), `<span>${name}</span>`);
      b.type = 'button';
      b.onclick = () => { set(i); onChange(i); };
      kb.appendChild(b);
      return b;
    });
    el.appendChild(kb);
    function set(i) { btns.forEach((b, j) => b.classList.toggle('on', j === i)); }
    set(value);
    return { el, set };
  };

  /* ---------- cadena de señal ---------- */
  ui.chain = function (root, ctx) {
    const { level, active, bypass, fresh, onToggle, onJump } = ctx;
    root.innerHTML = '';
    const M = KL.MODULES, B = KL.BOX;
    const info = (id) => M[id] ? { lvl: M[id].lvl, name: M[id].name, sub: M[id].sub, mod: id } : { ...B[id], mod: B[id].mod || null };
    function box(id) {
      const f = info(id), open = f.lvl <= level;
      const el = h('button', 'mod-box');
      el.type = 'button';
      el.dataset.id = id;
      if (!open) {
        el.classList.add('ghost');
        el.innerHTML = `<i class="lk"></i><b>${f.name}</b><small>nivel ${f.lvl}</small>`;
        el.onclick = () => onJump && onJump(f.lvl);
        el.title = `Se desbloquea en el nivel ${f.lvl}`;
        return el;
      }
      const mod = f.mod, off = mod && bypass.has(mod);
      el.innerHTML = `<i class="led ${off ? '' : 'on'}"></i><b>${f.name}</b><small>${f.sub}</small>`;
      if (id === 'osc') {
        const chips = KL.CHAIN.chips.filter((c) => M[c].lvl <= level).map((c) => `<em class="chip ${bypass.has(c) ? 'off' : ''} ${fresh.includes(c) ? 'is-new' : ''}">${M[c].name}</em>`).join('');
        if (chips) el.insertAdjacentHTML('beforeend', `<span class="chips">${chips}</span>`);
      }
      if (f.fixed) el.classList.add('fixed');
      if (off) el.classList.add('off');
      if (mod && fresh.includes(mod)) el.classList.add('is-new');
      el.title = f.fixed ? f.sub : off ? 'Apagado: toca para encender' : 'Encendido: toca para apagar (bypass)';
      if (mod) el.onclick = () => onToggle(mod);
      return el;
    }
    function row(name, ids, label, lockedAt) {
      const r = h('div', 'chain-row ' + name);
      const lab = h('div', 'row-l', label);
      r.appendChild(lab);
      const track = h('div', 'row-t');
      ids.forEach((id, i) => {
        if (i) {
          const prevOpen = info(ids[i - 1]).lvl <= level, open = info(id).lvl <= level;
          track.appendChild(h('div', 'wire' + (prevOpen && open ? ' live' : '')));
        }
        track.appendChild(box(id));
      });
      r.appendChild(track);
      if (lockedAt && level < lockedAt) r.classList.add('locked');
      return r;
    }
    root.appendChild(row('kick', KL.CHAIN.kick, 'KICK'));
    root.appendChild(row('rumble', KL.CHAIN.rumble, 'RUMBLE<small>bus de envío</small>', 10));
    root.appendChild(row('master', KL.CHAIN.master, 'MASTER'));
    // cuando entra un módulo nuevo, llevarlo a la vista en pantallas angostas
    const nb = root.querySelector('.is-new');
    if (nb && nb.scrollIntoView && root.scrollWidth > root.clientWidth + 4) setTimeout(() => { const t = nb.closest('.row-t'); if (t) t.scrollTo({ left: nb.offsetLeft - 40, behavior: 'smooth' }); }, 200);
  };

  /* ---------- canvas con resolución de pantalla ---------- */
  ui.fit = function (cv) {
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(10, Math.round(r.width * dpr)), hh = Math.max(10, Math.round(r.height * dpr));
    if (cv.width !== w || cv.height !== hh) { cv.width = w; cv.height = hh; }
    return { w, h: hh, dpr };
  };

  /* ---------- osciloscopio: forma de onda del golpe ---------- */
  ui.drawScope = function (cv, res, phase, ghost) {
    const { w, h: H, dpr } = ui.fit(cv), g = cv.getContext('2d');
    g.clearRect(0, 0, w, H);
    if (!res) return;
    const sr = res.sr, beatN = res.beatPos[1], top = 24 * dpr, mid = top + (H - top) * 0.5, amp = ((H - top) * 0.45) / Math.max(1, res.kick.peak);
    // grilla cada 50 ms
    g.strokeStyle = 'rgba(191,239,230,.07)'; g.lineWidth = 1; g.font = `${10 * dpr}px "JetBrains Mono", monospace`; g.fillStyle = 'rgba(191,239,230,.35)';
    for (let ms = 50; ms < res.meters.beatMs; ms += 50) {
      const x = ((ms / 1000) * sr / beatN) * w;
      g.beginPath(); g.moveTo(x, top); g.lineTo(x, H); g.stroke();
      if (ms % 100 === 0) g.fillText(ms + ' ms', x + 3 * dpr, H - 5 * dpr);
    }
    g.strokeStyle = 'rgba(191,239,230,.12)'; g.beginPath(); g.moveTo(0, mid); g.lineTo(w, mid); g.stroke();
    const drawWave = (data, color, fill, lw) => {
      const step = beatN / w;
      g.beginPath();
      const top = [], bot = [];
      for (let x = 0; x < w; x++) {
        const a = Math.floor(x * step), b = Math.min(data.length, Math.floor((x + 1) * step) + 1);
        let mn = 0, mx = 0;
        for (let i = a; i < b; i++) { const v = data[i] || 0; if (v < mn) mn = v; if (v > mx) mx = v; }
        top.push(mid - mx * amp); bot.push(mid - mn * amp);
      }
      g.moveTo(0, top[0]); top.forEach((y, x) => g.lineTo(x, y));
      for (let x = w - 1; x >= 0; x--) g.lineTo(x, bot[x]);
      g.closePath();
      if (fill) { g.fillStyle = fill; g.fill(); }
      g.strokeStyle = color; g.lineWidth = lw * dpr; g.stroke();
    };
    if (ghost) drawWave(ghost, 'rgba(255,255,255,.15)', null, 1);
    if (res.rumble) drawWave(res.rumble[0], 'rgba(0,128,137,.9)', 'rgba(0,128,137,.35)', 1);
    const kg = g.createLinearGradient(0, 0, 0, H);
    kg.addColorStop(0, 'rgba(195,226,152,.55)'); kg.addColorStop(0.5, 'rgba(195,226,152,.12)'); kg.addColorStop(1, 'rgba(195,226,152,.55)');
    drawWave(res.kick.data, LIME, kg, 1.2);
    // fin del pulso
    if (res.kick.data.length > beatN) { g.fillStyle = 'rgba(255,90,78,.85)'; g.fillRect(w - 3 * dpr, top, 3 * dpr, H - top); }
    if (phase != null && phase >= 0) {
      g.fillStyle = 'rgba(191,239,230,.85)'; g.fillRect(phase * w, top, 1.5 * dpr, H - top);
    }
  };

  /* ---------- espectro en vivo con eje en Hz y nota ---------- */
  const F0 = 20, F1 = 20000;
  const fx = (f, w) => (Math.log(f / F0) / Math.log(F1 / F0)) * w;
  ui.drawSpectrum = function (cv, an, sr, hold) {
    const { w, h: H, dpr } = ui.fit(cv), g = cv.getContext('2d');
    g.clearRect(0, 0, w, H);
    const axisH = 30 * dpr, PH = H - axisH, TOP = 26 * dpr;
    const DBMIN = -100, DBMAX = -10;
    g.font = `${10 * dpr}px "JetBrains Mono", monospace`;
    // grilla de frecuencia
    [30, 50, 100, 200, 500, 1000, 2000, 5000, 10000].forEach((f) => {
      const x = fx(f, w);
      g.strokeStyle = 'rgba(191,239,230,.07)'; g.beginPath(); g.moveTo(x, TOP); g.lineTo(x, PH); g.stroke();
      g.fillStyle = 'rgba(191,239,230,.45)';
      g.fillText(f >= 1000 ? f / 1000 + 'k' : String(f), x + 2 * dpr, PH + 12 * dpr);
    });
    // notas: cada Do
    for (let o = 1; o <= 8; o++) {
      const f = D().noteFreq(12 * (o + 1)), x = fx(f, w);
      g.fillStyle = 'rgba(195,226,152,.5)'; g.fillRect(x, PH + 16 * dpr, 1, 5 * dpr);
      g.fillText('C' + o, x + 2 * dpr, PH + 26 * dpr);
    }
    // zonas útiles
    const zone = (a, b, lab) => { const x0 = fx(a, w), x1 = fx(b, w); g.fillStyle = 'rgba(191,239,230,.035)'; g.fillRect(x0, TOP, x1 - x0, PH - TOP); g.fillStyle = 'rgba(191,239,230,.28)'; g.fillText(lab, x0 + 3 * dpr, TOP + 11 * dpr); };
    zone(20, 60, 'SUB'); zone(200, 400, 'BARRO'); zone(2000, 5000, 'PRESENCIA');
    if (!an) return null;
    const n = an.frequencyBinCount, data = new Float32Array(n);
    an.getFloatFrequencyData(data);
    const df = sr / 2 / n;
    const yOf = (v) => PH - ((Math.max(DBMIN, Math.min(DBMAX, v)) - DBMIN) / (DBMAX - DBMIN)) * (PH - TOP);
    // una columna por pixel: máximo de los bins que caen ahí
    const cols = new Float32Array(w).fill(-200);
    for (let i = 1; i < n; i++) {
      const f = i * df; if (f < F0 || f > F1) continue;
      const x = Math.floor(fx(f, w)); if (data[i] > cols[x]) cols[x] = data[i];
    }
    let last = -200;
    for (let x = 0; x < w; x++) { if (cols[x] <= -199) cols[x] = last; else last = cols[x]; }
    if (hold) for (let x = 0; x < w; x++) hold[x] = Math.max(cols[x], (hold[x] || -200) - 0.6);
    const grad = g.createLinearGradient(0, TOP, 0, PH);
    grad.addColorStop(0, 'rgba(195,226,152,.75)'); grad.addColorStop(1, 'rgba(0,128,137,.08)');
    g.beginPath(); g.moveTo(0, PH);
    for (let x = 0; x < w; x++) g.lineTo(x, yOf(cols[x]));
    g.lineTo(w, PH); g.closePath(); g.fillStyle = grad; g.fill();
    g.strokeStyle = LIME; g.lineWidth = 1.3 * dpr; g.beginPath();
    for (let x = 0; x < w; x++) x ? g.lineTo(x, yOf(cols[x])) : g.moveTo(x, yOf(cols[x]));
    g.stroke();
    if (hold) {
      g.strokeStyle = 'rgba(191,239,230,.5)'; g.lineWidth = 1 * dpr; g.beginPath();
      for (let x = 0; x < w; x++) x ? g.lineTo(x, yOf(hold[x])) : g.moveTo(x, yOf(hold[x]));
      g.stroke();
    }
    // pico (con interpolación parabólica)
    let bi = 0, bv = -200;
    for (let i = Math.ceil(25 / df); i < Math.min(n - 1, 16000 / df); i++) if (data[i] > bv) { bv = data[i]; bi = i; }
    if (bv < -90) return null;
    const a = data[bi - 1], b = data[bi], c = data[bi + 1], off = 0.5 * (a - c) / (a - 2 * b + c || 1);
    const pf = (bi + off) * df, px = fx(pf, w);
    g.fillStyle = AQUA; g.beginPath(); g.arc(px, yOf(bv), 3.5 * dpr, 0, Math.PI * 2); g.fill();
    return pf;
  };

  /* ---------- espectrograma en cascada (20 Hz a 4 kHz) ---------- */
  const PAL = [[6, 10, 11], [2, 40, 45], [2, 97, 104], [0, 128, 137], [120, 190, 160], [195, 226, 152], [245, 255, 235]];
  function colorAt(t) {
    t = Math.max(0, Math.min(0.999, t)) * (PAL.length - 1);
    const i = Math.floor(t), f = t - i, a = PAL[i], b = PAL[i + 1];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  }
  ui.drawSpectrogram = function (cv, an, sr, buf) {
    const { w, h: H, dpr } = ui.fit(cv), g = cv.getContext('2d');
    if (!an) return;
    const n = an.frequencyBinCount;
    if (!buf.data || buf.data.length !== n) buf.data = new Float32Array(n);
    an.getFloatFrequencyData(buf.data);
    const df = sr / 2 / n, fl = 20, fh = 4000, axis = 34 * dpr, W = w - axis, TOP = 26 * dpr, HH = H - TOP;
    const sp = Math.max(1, Math.round(2 * dpr));
    g.drawImage(cv, axis + sp, TOP, W - sp, HH, axis, TOP, W - sp, HH);
    const col = g.createImageData(sp, HH);
    for (let y = 0; y < HH; y++) {
      const f = fl * Math.pow(fh / fl, 1 - y / HH), i = Math.round(f / df);
      const v = (buf.data[i] + 100) / 80, [r, gg, b] = colorAt(v);
      for (let k = 0; k < sp; k++) { const o = (y * sp + k) * 4; col.data[o] = r; col.data[o + 1] = gg; col.data[o + 2] = b; col.data[o + 3] = 255; }
    }
    g.putImageData(col, w - sp, TOP);
    // eje
    g.fillStyle = '#0b1011'; g.fillRect(0, 0, axis, H);
    g.font = `${9.5 * dpr}px "JetBrains Mono", monospace`; g.fillStyle = 'rgba(191,239,230,.5)';
    [30, 50, 100, 200, 500, 1000, 2000].forEach((f) => {
      const y = TOP + HH * (1 - Math.log(f / fl) / Math.log(fh / fl));
      g.fillRect(axis - 4 * dpr, y, 4 * dpr, 1);
      g.fillText(f >= 1000 ? f / 1000 + 'k' : String(f), 2 * dpr, y + 3 * dpr);
    });
  };

  /* ---------- mini pantallas de cada módulo ---------- */
  function frame(cv) {
    const { w, h: H, dpr } = ui.fit(cv), g = cv.getContext('2d');
    g.clearRect(0, 0, w, H);
    g.strokeStyle = 'rgba(191,239,230,.06)';
    for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(0, (H * i) / 4); g.lineTo(w, (H * i) / 4); g.stroke(); }
    g.font = `${9 * dpr}px "JetBrains Mono", monospace`;
    return { w, H, g, dpr };
  }
  function line(g, pts, color, lw, fill, H) {
    g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    if (fill) { g.lineTo(pts[pts.length - 1][0], H); g.lineTo(pts[0][0], H); g.closePath(); g.fillStyle = fill; g.fill(); g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); }
    g.strokeStyle = color; g.lineWidth = lw; g.stroke();
  }
  const label = (g, t, x, y, c) => { g.fillStyle = c || 'rgba(191,239,230,.55)'; g.fillText(t, x, y); };

  ui.drawModule = function (id, cv, P, mods, bpm, sr) {
    const { w, H, g, dpr } = frame(cv);
    const beat = 60 / bpm, pad = 6 * dpr;
    const fillL = 'rgba(195,226,152,.14)';
    if (id === 'osc' || id === 'wave') {
      const type = mods.has('wave') ? P.wave.type : 'sine', r = Math.random;
      const pts = [];
      for (let x = 0; x <= w; x++) {
        const ph = ((x / w) * 2) % 1;
        const y = type === 'noise' ? r() * 2 - 1 : (type === 'sine' ? Math.sin(ph * Math.PI * 2) : type === 'tri' ? 1 - 4 * Math.abs(((ph + 0.25) % 1) - 0.5) : type === 'saw' ? 2 * ((ph + 0.5) % 1) - 1 : ph < 0.5 ? 1 : -1);
        pts.push([x, H / 2 - y * H * 0.36]);
      }
      line(g, pts, LIME, 1.5 * dpr, null, H);
      const k = D().kickPlan(P, mods, bpm), n = D().freqToNote(k.f0);
      label(g, `${k.f0.toFixed(1).replace('.', ',')} Hz · ${n.name} ${n.cents >= 0 ? '+' : ''}${n.cents}¢`, pad, 12 * dpr, AQUA);
      label(g, '2 ciclos', w - 52 * dpr, H - 5 * dpr);
    } else if (id === 'amp' || id === 'tune') {
      const k = D().kickPlan(P, mods, bpm), T = Math.max(beat * 1.15, k.att + k.hold + k.decay);
      const pts = [];
      for (let x = 0; x <= w; x++) {
        const t = (x / w) * T; let e;
        if (t < k.att) e = t / k.att; else if (t < k.att + k.hold) e = 1; else { const q = (t - k.att - k.hold) / k.decay; e = q >= 1 ? 0 : Math.pow(1 - q, k.curve); }
        pts.push([x, H - pad - e * (H - 2 * pad)]);
      }
      line(g, pts, LIME, 1.6 * dpr, fillL, H);
      const bx = (beat / T) * w;
      g.fillStyle = 'rgba(255,90,78,.8)'; g.fillRect(bx, 0, 1.5 * dpr, H);
      label(g, 'golpe siguiente', bx - 86 * dpr, 12 * dpr, 'rgba(255,140,130,.85)');
      const tot = (k.att + k.hold + k.decay) * 1000;
      label(g, `largo ${Math.round(tot)} ms · pulso ${Math.round(beat * 1000)} ms`, pad, H - 5 * dpr, AQUA);
    } else if (id === 'pitch') {
      const k = D().kickPlan(P, mods, bpm), T = 0.3, fl = 30, fh = 1000;
      const yF = (f) => H - pad - (Math.log(f / fl) / Math.log(fh / fl)) * (H - 2 * pad);
      const pts = [];
      for (let x = 0; x <= w; x++) {
        const t = (x / w) * T, pt2 = P.pitch.time / 1000;
        const f = t < pt2 ? k.f0 + (P.pitch.start - k.f0) * Math.pow(1 - t / pt2, P.pitch.curve) : k.f0;
        pts.push([x, yF(f)]);
      }
      [50, 100, 200, 500].forEach((f) => { g.fillStyle = 'rgba(191,239,230,.3)'; g.fillText(f + ' Hz', w - 44 * dpr, yF(f) - 2 * dpr); });
      line(g, pts, LIME, 1.8 * dpr, fillL, H);
      label(g, 'frecuencia vs tiempo (0–300 ms)', pad, 12 * dpr, AQUA);
    } else if (id === 'filter' || id === 'eq') {
      const fl = 20, fh = 20000, yD = (d) => H / 2 - (d / 24) * (H / 2 - pad);
      const xf = (x) => fl * Math.pow(fh / fl, x / w);
      const curves = [];
      if (id === 'filter') {
        const F = P.filter, b0 = new (D().Biquad)().set(F.type, Math.min(F.cutoff * Math.pow(2, F.env), sr * 0.45), F.q, 0, sr), b1 = new (D().Biquad)().set(F.type, F.cutoff, F.q, 0, sr);
        curves.push([[b0], 'rgba(191,239,230,.55)'], [[b1], LIME]);
        label(g, F.env > 0.05 ? 'aqua: en el golpe · lima: en la cola' : 'respuesta del filtro', pad, 12 * dpr, AQUA);
      } else {
        const E = P.eq, B = D().Biquad, bs = [];
        if (E.hpf > 10.5) { bs.push(new B().set('hp', E.hpf, 0.5412, 0, sr)); bs.push(new B().set('hp', E.hpf, 1.3066, 0, sr)); }
        bs.push(new B().set('peak', E.mudF, 1.2, E.mud, sr)); bs.push(new B().set('peak', E.presF, 1.0, E.pres, sr));
        curves.push([bs, LIME]);
        label(g, 'curva del EQ', pad, 12 * dpr, AQUA);
      }
      g.strokeStyle = 'rgba(191,239,230,.15)'; g.beginPath(); g.moveTo(0, yD(0)); g.lineTo(w, yD(0)); g.stroke();
      [100, 1000, 10000].forEach((f) => { const x = (Math.log(f / fl) / Math.log(fh / fl)) * w; g.fillStyle = 'rgba(191,239,230,.3)'; g.fillText(f >= 1000 ? f / 1000 + 'k' : f, x + 2, H - 4 * dpr); g.fillRect(x, 0, 1, H); });
      curves.forEach(([bs, c]) => {
        const pts = [];
        for (let x = 0; x <= w; x += 2) { const f = xf(x); let d = 0; bs.forEach((b) => (d += b.mag(f, sr))); pts.push([x, yD(Math.max(-30, Math.min(24, d)))]); }
        line(g, pts, c, 1.6 * dpr, null, H);
      });
    } else if (id === 'drive') {
      const Dr = P.drive, gain = Math.pow(10, Dr.drive / 20), mix = Dr.mix / 100, q = Math.pow(2, Dr.bits - 1);
      const X = 1.2, pts = [], ref = [];
      for (let x = 0; x <= w; x++) {
        const v = ((x / w) * 2 - 1) * X;
        let s = Dr.mode === 'crush' ? Math.round(Math.max(-1, Math.min(1, v * gain)) * q) / q : D().shaper(Dr.mode, v * gain);
        const y = v * (1 - mix) + s * mix * 0.9;
        pts.push([x, H / 2 - (y / 1.5) * (H / 2)]); ref.push([x, H / 2 - (v / 1.5) * (H / 2)]);
      }
      line(g, ref, 'rgba(191,239,230,.2)', 1 * dpr, null, H);
      line(g, pts, LIME, 1.8 * dpr, null, H);
      label(g, 'curva de transferencia: entrada → salida', pad, 12 * dpr, AQUA);
    } else if (id === 'duck') {
      const pts = [];
      for (let x = 0; x <= w; x++) { const t = (x / w) * beat; const gn = D().duckGain(P.duck, t, beat); pts.push([x, pad + (1 - gn) * (H - 2 * pad)]); }
      const pts2 = pts.map(([x, y]) => [x, y]);
      line(g, pts2, LIME, 1.8 * dpr, null, H);
      g.fillStyle = 'rgba(195,226,152,.14)'; g.beginPath(); g.moveTo(0, H); pts2.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(w, H); g.closePath(); g.fill();
      label(g, 'volumen del rumble durante un pulso', pad, H - 5 * dpr, AQUA);
      label(g, 'kick', 3 * dpr, 12 * dpr, 'rgba(255,140,130,.9)');
      g.fillStyle = 'rgba(255,90,78,.8)'; g.fillRect(0, 0, 2 * dpr, H);
    } else if (id === 'verb') {
      const V = P.verb, T = Math.max(1, V.decay * 1.1), pts = [];
      for (let x = 0; x <= w; x++) { const t = (x / w) * T - V.pre / 1000; const e = t < 0 ? 0 : Math.pow(10, (-3 * t) / V.decay); pts.push([x, H - pad - e * (H - 2 * pad)]); }
      line(g, pts, LIME, 1.6 * dpr, fillL, H);
      const bx = (beat / T) * w;
      for (let k = 1; k * beat < T; k++) { g.fillStyle = 'rgba(255,90,78,.5)'; g.fillRect(k * bx, 0, 1, H); }
      label(g, `cola de ${V.decay.toFixed(1).replace('.', ',')} s = ${(V.decay / beat).toFixed(1).replace('.', ',')} pulsos`, pad, 12 * dpr, AQUA);
    } else {
      cv.style.display = 'none';
    }
  };
  ui.MODULE_DISPLAY = ['osc', 'amp', 'pitch', 'filter', 'drive', 'eq', 'tune', 'verb', 'duck'];
})();
