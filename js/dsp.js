/* KICK LAB · motor DSP
   El kick se sintetiza muestra a muestra (fase acumulada, PolyBLEP, biquads RBJ).
   La reverb del rumble es una convolución real (ConvolverNode en OfflineAudioContext)
   con una respuesta al impulso generada. Todo es determinista (ruido con semilla),
   así el A/B, el juez del reto de oído y la exportación suenan idéntico. */
(function () {
  'use strict';
  const KL = (window.KL = window.KL || {});
  const TAU = Math.PI * 2;
  const db = (x) => Math.pow(10, x / 20);
  const toDb = (x) => 20 * Math.log10(Math.max(x, 1e-12));
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const CEIL = db(-1.05); // techo del limitador de protección (bajo -1 dBFS)

  /* ---------- notas ---------- */
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const noteFreq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
  function freqToNote(f) {
    if (!(f > 0)) return { name: '—', cents: 0, midi: 0 };
    const m = 69 + 12 * Math.log2(f / 440);
    const r = Math.round(m);
    return { midi: r, name: NOTE_NAMES[((r % 12) + 12) % 12] + (Math.floor(r / 12) - 1), cents: Math.round((m - r) * 100) };
  }
  // nota de la tonalidad llevada al rango de kick (35–71 Hz)
  function keyFreq(key) { // la octava más cercana a 50 Hz
    let f = noteFreq(12 + key);
    while (f * 2 < 50 * Math.SQRT2) f *= 2;
    return f;
  }

  /* ---------- ruido con semilla ---------- */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
    };
  }

  /* ---------- osciladores con PolyBLEP (menos aliasing) ---------- */
  function blep(t, dt) {
    if (t < dt) { t /= dt; return t + t - t * t - 1; }
    if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
    return 0;
  }
  // todas parten en cero (salvo la cuadrada) para no hacer click al inicio
  function oscSample(type, ph, dt) {
    switch (type) {
      case 'tri': return 1 - 4 * Math.abs(((ph + 0.25) % 1) - 0.5);
      case 'saw': { const p = (ph + 0.5) % 1; return 2 * p - 1 - blep(p, dt); }
      case 'square': { let s = ph < 0.5 ? 1 : -1; s += blep(ph, dt); s -= blep((ph + 0.5) % 1, dt); return s; }
      default: return Math.sin(TAU * ph);
    }
  }

  /* ---------- biquad RBJ (forma directa transpuesta II) ---------- */
  class Biquad {
    constructor() { this.b0 = 1; this.b1 = 0; this.b2 = 0; this.a1 = 0; this.a2 = 0; this.z1 = 0; this.z2 = 0; }
    set(type, f, Q, g, sr) {
      f = clamp(f, 5, sr * 0.47);
      const w = (TAU * f) / sr, cw = Math.cos(w), sw = Math.sin(w), al = sw / (2 * Q), A = Math.pow(10, (g || 0) / 40);
      let b0, b1, b2, a0, a1, a2;
      switch (type) {
        case 'hp': b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; break;
        case 'bp': b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; break;
        case 'peak': b0 = 1 + al * A; b1 = -2 * cw; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cw; a2 = 1 - al / A; break;
        case 'hs': {
          const sq = 2 * Math.sqrt(A) * al;
          b0 = A * ((A + 1) + (A - 1) * cw + sq); b1 = -2 * A * ((A - 1) + (A + 1) * cw); b2 = A * ((A + 1) + (A - 1) * cw - sq);
          a0 = (A + 1) - (A - 1) * cw + sq; a1 = 2 * ((A - 1) - (A + 1) * cw); a2 = (A + 1) - (A - 1) * cw - sq; break;
        }
        default: b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; // lp
      }
      this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0;
      return this;
    }
    process(x) {
      const y = this.b0 * x + this.z1;
      this.z1 = this.b1 * x - this.a1 * y + this.z2;
      this.z2 = this.b2 * x - this.a2 * y;
      return y;
    }
    // magnitud en dB a la frecuencia f (para dibujar la respuesta)
    mag(f, sr) {
      const w = (TAU * f) / sr;
      const c1 = Math.cos(w), s1 = Math.sin(w), c2 = Math.cos(2 * w), s2 = Math.sin(2 * w);
      const nr = this.b0 + this.b1 * c1 + this.b2 * c2, ni = -(this.b1 * s1 + this.b2 * s2);
      const dr = 1 + this.a1 * c1 + this.a2 * c2, di = -(this.a1 * s1 + this.a2 * s2);
      return 10 * Math.log10((nr * nr + ni * ni) / (dr * dr + di * di) + 1e-20);
    }
  }
  // Butterworth de 4º orden = dos biquads
  const BW4 = [0.5412, 1.3066];
  function filt4(arr, type, f, sr) {
    for (const q of BW4) { const b = new Biquad().set(type, f, q, 0, sr); for (let i = 0; i < arr.length; i++) arr[i] = b.process(arr[i]); }
  }
  function filt(arr, type, f, Q, g, sr) {
    const b = new Biquad().set(type, f, Q, g, sr);
    for (let i = 0; i < arr.length; i++) arr[i] = b.process(arr[i]);
  }

  /* ---------- saturación ---------- */
  const T_BIAS = Math.tanh(0.35);
  // sobremuestreo con IIR (Butterworth de 8º orden): la saturación no devuelve aliasing
  const BW8 = [0.5098, 0.6013, 0.9000, 2.5629];
  function oversampled(arr, factor, fn, sr) {
    const osr = sr * factor, up = BW8.map((q) => new Biquad().set('lp', sr * 0.45, q, 0, osr)), dn = BW8.map((q) => new Biquad().set('lp', sr * 0.45, q, 0, osr));
    for (let i = 0; i < arr.length; i++) {
      let keep = 0;
      for (let k = 0; k < factor; k++) {
        let x = k === 0 ? arr[i] * factor : 0;
        for (let j = 0; j < 4; j++) x = up[j].process(x);
        let y = fn(x, i);
        for (let j = 0; j < 4; j++) y = dn[j].process(y);
        if (k === 0) keep = y;
      }
      arr[i] = keep;
    }
  }
  function shaper(mode, v) {
    switch (mode) {
      case 'hard': return v > 1 ? 1 : v < -1 ? -1 : v;
      case 'fold': return Math.sin((v * Math.PI) / 2); // wavefolder: pasado 1 la onda se dobla
      case 'tube': return ((Math.tanh(v + 0.35) - T_BIAS) / (1 + T_BIAS)) * 1.6; // asimétrico: pares
      default: return Math.tanh(v);
    }
  }

  /* ---------- parámetros efectivos del kick ---------- */
  function kickPlan(P, mods, bpm) {
    const on = (id) => mods.has(id);
    const k = {};
    k.f0 = on('tune') ? keyFreq(P.tune.key) * Math.pow(2, P.tune.cents / 1200) : P.osc.freq;
    if (on('amp')) {
      k.att = P.amp.attack / 1000; k.hold = P.amp.hold / 1000; k.decay = P.amp.decay / 1000; k.curve = P.amp.curve;
    } else { // nivel 1: el seno se prende y se apaga, como una tecla
      k.att = 0.003; k.hold = 0.24; k.decay = 0.01; k.curve = 1;
    }
    if (on('tune')) {
      const total = (P.tune.len / 100) * (60 / bpm);
      k.decay = Math.max(0.03, total - k.att - k.hold);
    }
    k.pitch = on('pitch');
    k.wave = on('wave') ? P.wave.type : 'sine';
    return k;
  }

  /* ---------- síntesis del kick (one-shot, mono) ---------- */
  function synthKick(P, mods, sr, bpm) {
    const on = (id) => mods.has(id);
    const k = kickPlan(P, mods, bpm);
    const dur = Math.min(3, k.att + k.hold + k.decay + (on('filter') || on('eq') ? 0.08 : 0.01));
    const N = Math.ceil(dur * sr);
    const out = new Float32Array(N);
    const R = rng(1234), Rn = rng(777);
    const ps = P.pitch.start, pt = P.pitch.time / 1000, pc = P.pitch.curve;
    const clickOn = on('click');
    const C = P.click;
    const bpN = new Biquad().set('bp', C.nfreq, 0.9, 0, sr);
    const nd = C.ndecay / 1000, td = C.tdecay / 1000;
    let ph = 0, tph = 0;
    const edge = k.att + k.hold;
    for (let i = 0; i < N; i++) {
      const t = i / sr;
      let f = k.f0;
      if (k.pitch && t < pt) { const x = t / pt; f = k.f0 + (ps - k.f0) * Math.pow(1 - x, pc); }
      const dt = f / sr;
      const s = k.wave === 'noise' ? R() : oscSample(k.wave, ph, dt);
      ph += dt; if (ph >= 1) ph -= 1;
      let e;
      if (t < k.att) e = t / k.att;
      else if (t < edge) e = 1;
      else { const x = (t - edge) / k.decay; e = x >= 1 ? 0 : Math.pow(1 - x, k.curve); }
      let y = s * e * 0.8;
      if (clickOn) {
        const a = t < 0.0004 ? t / 0.0004 : 1;
        let cl = 0;
        if (C.noise > 0 && t < nd * 1.5) cl += bpN.process(Rn()) * a * Math.pow(10, (-3 * t) / nd) * (C.noise / 100) * 1.6;
        if (C.tone > 0 && t < td * 1.5) {
          const tf = C.tfreq * (1 - 0.5 * Math.min(1, t / td)), tdt = tf / sr;
          cl += oscSample('square', tph, tdt) * a * Math.pow(10, (-3 * t) / td) * (C.tone / 100) * 0.55;
          tph += tdt; if (tph >= 1) tph -= 1;
        }
        y += C.pol === 'neg' ? -cl : cl;
      }
      out[i] = y;
    }
    // DRIVE (va antes del filtro: el filtro doma el chirrido que crea)
    if (on('drive')) {
      const D = P.drive, g = db(D.drive), mix = D.mix / 100;
      const step = Math.max(1, Math.round(D.rate)), q = Math.pow(2, D.bits - 1);
      if (D.mode === 'crush') { // el bitcrush busca el aliasing: sin sobremuestreo
        let held = 0;
        for (let i = 0; i < N; i++) {
          const x = out[i];
          if (i % step === 0) held = Math.round(clamp(x * g, -1, 1) * q) / q;
          out[i] = x * (1 - mix) + held * mix * 0.9;
        }
      } else {
        const dry = out.slice();
        oversampled(out, 4, (v) => shaper(D.mode, v * g), sr);
        for (let i = 0; i < N; i++) out[i] = dry[i] * (1 - mix) + out[i] * mix * 0.9;
      }
      // bloqueo de DC (el modo asimétrico corre el centro de la onda)
      let px = 0, py = 0; const R1 = 1 - (TAU * 10) / sr;
      for (let i = 0; i < N; i++) { const x = out[i]; py = x - px + R1 * py; px = x; out[i] = py; }
    }
    // FILTRO con envolvente
    if (on('filter')) {
      const F = P.filter, bq = new Biquad(), tau = F.edecay / 1000 / 3;
      for (let i = 0; i < N; i++) {
        if ((i & 15) === 0) {
          const fc = F.cutoff * Math.pow(2, F.env * Math.exp(-(i / sr) / tau));
          bq.set(F.type, Math.min(fc, sr * 0.45), F.q, 0, sr);
        }
        out[i] = bq.process(out[i]);
      }
    }
    // EQ de limpieza
    if (on('eq')) {
      const E = P.eq;
      if (E.hpf > 10.5) filt4(out, 'hp', E.hpf, sr);
      if (Math.abs(E.mud) > 0.05) filt(out, 'peak', E.mudF, 1.2, E.mud, sr);
      if (Math.abs(E.pres) > 0.05) filt(out, 'peak', E.presF, 1.0, E.pres, sr);
    }
    // largo audible (hasta -40 dB del pico)
    let pk = 0; for (let i = 0; i < N; i++) pk = Math.max(pk, Math.abs(out[i]));
    const th = pk * db(-40); let last = 0;
    for (let i = N - 1; i >= 0; i--) if (Math.abs(out[i]) > th) { last = i; break; }
    return { data: out, f0: k.f0, plan: k, lenMs: (last / sr) * 1000, peak: pk };
  }

  /* ---------- respuesta al impulso de la "sala" del rumble ---------- */
  const irCache = new Map();
  function makeIR(V, sr) {
    const key = [V.decay, V.pre, V.damp, sr].map((x) => (+x).toFixed(3)).join('|');
    if (irCache.has(key)) return irCache.get(key);
    const pre = Math.round((V.pre / 1000) * sr), len = pre + Math.round(Math.min(9, V.decay * 1.05) * sr);
    const chans = [0, 1].map((c) => {
      const r = rng(9001 + c * 77), ir = new Float32Array(len);
      let y = 0, en = 0;
      for (let i = pre; i < len; i++) {
        const t = (i - pre) / sr;
        const fc = Math.max(70, V.damp * Math.pow(2, (-3 * t) / V.decay));
        const a = 1 - Math.exp((-TAU * fc) / sr);
        y += a * (r() - y);
        const fade = t < 0.012 ? t / 0.012 : 1;
        const v = y * Math.pow(10, (-3 * t) / V.decay) * fade;
        ir[i] = v; en += v * v;
      }
      const s = 1 / Math.sqrt(en + 1e-12);
      for (let i = 0; i < len; i++) ir[i] *= s;
      return ir;
    });
    if (irCache.size > 6) irCache.clear();
    irCache.set(key, chans);
    return chans;
  }

  // convolución real con el ConvolverNode de Web Audio, en un OfflineAudioContext
  async function convolve(input, ir, sr) {
    const ctx = new OfflineAudioContext(2, input.length, sr);
    const b = ctx.createBuffer(1, input.length, sr); b.copyToChannel(input, 0);
    const irb = ctx.createBuffer(2, ir[0].length, sr); irb.copyToChannel(ir[0], 0); irb.copyToChannel(ir[1], 1);
    const conv = ctx.createConvolver(); conv.normalize = false; conv.buffer = irb;
    const src = ctx.createBufferSource(); src.buffer = b;
    src.connect(conv); conv.connect(ctx.destination); src.start();
    const out = await ctx.startRendering();
    return [out.getChannelData(0).slice(), out.getChannelData(1).slice()];
  }

  /* ---------- hat abierto en el contratiempo (estilo 808/909 metálico) ---------- */
  function synthHat(sr, decayMs) {
    const d = decayMs / 1000, N = Math.ceil((d * 1.3 + 0.01) * sr), out = new Float32Array(N);
    const fr = [205.3, 304.4, 369.6, 522.7, 540, 800].map((f) => f * 1.55), ph = fr.map(() => 0), R = rng(4242);
    const bp = new Biquad().set('bp', 9500, 0.8, 0, sr), hp = new Biquad().set('hp', 7000, 0.7, 0, sr);
    for (let i = 0; i < N; i++) {
      const t = i / sr; let m = 0;
      for (let j = 0; j < 6; j++) { const dt = fr[j] / sr; m += oscSample('square', ph[j], dt); ph[j] = (ph[j] + dt) % 1; }
      const s = hp.process(bp.process(m / 6) * 1.5 + R() * 0.35);
      out[i] = s * Math.pow(10, (-3 * t) / d) * (t < 0.0005 ? t / 0.0005 : 1);
    }
    return out;
  }

  /* ---------- arpegio trance de fondo ---------- */
  const ARP = [0, 12, 7, 3, 12, 7, 15, 12, 0, 12, 7, 3, 19, 15, 12, 7];
  function synthLead(P, sr, N, barN, key) {
    const L = new Float32Array(N), R = new Float32Array(N);
    const root = keyFreq(key) * 4, step = barN / 16, det = [-0.11, 0, 0.11], pan = [[0.9, 0.25], [0.6, 0.6], [0.25, 0.9]];
    const cut = P.lead.cut, amp = (P.lead.level / 100) * 0.75;
    let n0 = 0, idx = 0;
    while (n0 < N) {
      const start = Math.round(idx * step), end = Math.min(N, Math.round((idx + 1) * step) + Math.round(0.05 * sr));
      const f = root * Math.pow(2, ARP[idx % 16] / 12), lp = new Biquad(), ph = [0.1, 0.4, 0.7];
      for (let i = start; i < end; i++) {
        const t = (i - start) / sr;
        if ((i & 31) === 0 || i === start) lp.set('lp', Math.min(cut * (1 + 3 * Math.exp(-t / 0.04)), sr * 0.45), 1.2, 0, sr);
        const env = Math.pow(10, (-3 * t) / 0.32) * (t < 0.002 ? t / 0.002 : 1);
        let l = 0, r = 0;
        for (let v = 0; v < 3; v++) {
          const dt = (f * Math.pow(2, det[v] / 12)) / sr, s = oscSample('saw', ph[v], dt);
          ph[v] = (ph[v] + dt) % 1; l += s * pan[v][0]; r += s * pan[v][1];
        }
        const m = lp.process((l + r) * 0.5) * env * amp, sd = (l - r) * 0.5 * env * amp * 0.6;
        L[i] += m + sd; R[i] += m - sd;
      }
      idx++; n0 = start;
    }
    // delay ping-pong de 3/16
    const D = Math.round(step * 3), fb = 0.38;
    for (let i = D; i < N; i++) { L[i] += R[i - D] * fb; R[i] += L[i - D] * fb; }
    return [L, R];
  }

  /* ---------- curva de ducking (volume shaping) ---------- */
  function duckGain(Dk, tb, beatSec) {
    const d = db(-Dk.depth), a = 0.0015, h = Dk.hold / 1000, r = Dk.release / 1000;
    const rise = (x) => d + (1 - d) * Math.pow(clamp(x, 0, 1), Dk.shape);
    if (tb < a) { const endV = rise((beatSec - a - h) / r); return endV + (d - endV) * (tb / a); }
    if (tb < a + h) return d;
    return rise((tb - a - h) / r);
  }

  /* ---------- limitador de protección (mira adelante: ningún pico pasa) ---------- */
  function limiter(L, R, ceil, sr) {
    const N = L.length, w = Math.max(2, Math.round(0.003 * sr));
    const gr = new Float32Array(N);
    for (let i = 0; i < N; i++) { const p = Math.max(Math.abs(L[i]), R ? Math.abs(R[i]) : 0); gr[i] = p > ceil ? ceil / p : 1; }
    // mínimo hacia adelante en ventana w (deque)
    const m = new Float32Array(N), dq = new Int32Array(N); let h = 0, t = 0;
    for (let i = N - 1; i >= 0; i--) {
      while (t > h && gr[dq[t - 1]] >= gr[i]) t--;
      dq[t++] = i;
      while (dq[h] > i + w - 1) h++;
      m[i] = gr[dq[h]];
    }
    // promedio móvil hacia atrás: suaviza el ataque sin dejar pasar picos
    let acc = 0, g = 1; const rc = 1 - Math.exp(-1 / (0.06 * sr));
    let maxGR = 0;
    for (let i = 0; i < N; i++) {
      acc += m[i]; if (i >= w) acc -= m[i - w];
      const s = acc / Math.min(i + 1, w);
      g = s < g ? s : g + (s - g) * rc;
      maxGR = Math.max(maxGR, 1 - g);
      L[i] = clamp(L[i] * g, -ceil, ceil); if (R) R[i] = clamp(R[i] * g, -ceil, ceil);
    }
    return toDb(1 - maxGR);
  }

  /* ---------- loudness (ITU BS.1770, ponderación K, sin gating) ---------- */
  function lufs(L, R, sr) {
    let sum = 0;
    for (const ch of [L, R]) {
      const a = new Biquad().set('hs', 1681.97, 0.7071, 3.9998, sr), b = new Biquad().set('hp', 38.13, 0.5003, 0, sr);
      // calentar los filtros con el loop (es periódico)
      for (let i = 0; i < ch.length; i++) b.process(a.process(ch[i]));
      let s = 0;
      for (let i = 0; i < ch.length; i++) { const z = b.process(a.process(ch[i])); s += z * z; }
      sum += s / ch.length;
    }
    return -0.691 + 10 * Math.log10(sum + 1e-20);
  }

  const DIVS = { '1/16': 0.25, '1/8': 0.5, '3/16': 0.75, '1/4': 1 };

  /* ---------- render de un compás en estado estable ----------
     mode: 'full' (todo) · 'kick' (solo kicks) · 'rumble' (solo rumble)  */
  async function renderMix(P, mods, bpm, sr, mode) {
    mode = mode || 'full';
    const on = (id) => mods.has(id);
    const kick = synthKick(P, mods, sr, bpm);
    const beatSec = 60 / bpm, barN = Math.round(beatSec * 4 * sr);
    const beatPos = [0, 1, 2, 3, 4].map((j) => Math.round((j * barN) / 4));
    const rumbleOn = on('verb') && mode !== 'kick' && P.verb.send > 0;
    const dTail = on('delay') && P.delay.level > 0 && P.delay.fb > 1 ? (Math.log(0.001) / Math.log(P.delay.fb / 100)) * beatSec * DIVS[P.delay.div] : 0;
    const tail = rumbleOn ? P.verb.decay + P.verb.pre / 1000 + dTail : kick.data.length / sr;
    const nBars = Math.min(10, Math.max(3, Math.ceil(tail / (barN / sr)) + 2));
    const N = nBars * barN;
    const kb = new Float32Array(N);
    for (let b = 0; b < nBars; b++) for (let j = 0; j < 4; j++) {
      const p = b * barN + beatPos[j];
      for (let i = 0; i < kick.data.length && p + i < N; i++) kb[p + i] += kick.data[i];
    }
    const L = new Float32Array(N), R = new Float32Array(N);
    if (mode !== 'rumble') { L.set(kb); R.set(kb); }
    let rum = null;
    // ganancia de ducking por muestra (sirve al rumble y al lead)
    let duck = null;
    if (on('duck')) {
      duck = new Float32Array(N);
      for (let b = 0; b < nBars; b++) for (let j = 0; j < 4; j++) {
        const p0 = b * barN + beatPos[j], p1 = b * barN + beatPos[j + 1];
        for (let i = p0; i < p1; i++) duck[i] = duckGain(P.duck, (i - p0) / sr, beatSec);
      }
    }
    if (rumbleOn) {
      const send = new Float32Array(N), sg = P.verb.send / 100;
      for (let i = 0; i < N; i++) send[i] = kb[i] * sg;
      let revIn = send, direct = null;
      if (on('delay') && P.delay.level > 0) {
        const D = Math.max(1, Math.round(beatSec * sr * DIVS[P.delay.div])), fb = P.delay.fb / 100, lv = P.delay.level / 100;
        const y = new Float32Array(N);
        for (let i = D; i < N; i++) y[i] = send[i - D] + fb * y[i - D];
        revIn = new Float32Array(N); direct = new Float32Array(N);
        for (let i = 0; i < N; i++) { revIn[i] = send[i] + y[i] * lv; direct[i] = y[i] * lv * 0.5; }
      }
      const [cl, cr] = await convolve(revIn, makeIR(P.verb, sr), sr);
      const ret = (P.verb.ret / 100) * 0.32;
      for (let i = 0; i < N; i++) { cl[i] *= ret; cr[i] *= ret; if (direct) { cl[i] += direct[i]; cr[i] += direct[i]; } }
      for (const ch of [cl, cr]) {
        if (on('rdrive') && P.rdrive.drive > 0.05) {
          const g = db(P.rdrive.drive), mk = Math.pow(g, -0.8);
          for (let i = 0; i < N; i++) ch[i] = Math.tanh(ch[i] * g) * mk;
        }
        if (on('rlpf')) { filt4(ch, 'lp', P.rlpf.cut, sr); if (P.rlpf.hpf > 20.5) filt4(ch, 'hp', P.rlpf.hpf, sr); }
        if (on('rtune') && P.rtune.gain > 0.05) { // octava y quinta de la nota del kick: canta sin pisar el sub
          filt(ch, 'peak', kick.f0 * 2, P.rtune.q, P.rtune.gain, sr);
          filt(ch, 'peak', kick.f0 * 3, P.rtune.q, P.rtune.gain * 0.6, sr);
        }
      }
      if (on('rclean') && P.rclean.mono > 1) { // mono bajo X Hz (M/S)
        const S = new Float32Array(N);
        for (let i = 0; i < N; i++) S[i] = (cl[i] - cr[i]) * 0.5;
        filt4(S, 'hp', P.rclean.mono, sr);
        for (let i = 0; i < N; i++) { const M = (cl[i] + cr[i]) * 0.5; cl[i] = M + S[i]; cr[i] = M - S[i]; }
      }
      if (duck) for (let i = 0; i < N; i++) { cl[i] *= duck[i]; cr[i] *= duck[i]; }
      for (let i = 0; i < N; i++) { L[i] += cl[i]; R[i] += cr[i]; }
      rum = [cl, cr];
    }
    if (mode === 'full') {
      if (on('hat') && P.hat.level > 0) {
        const h = synthHat(sr, P.hat.decay), hg = (P.hat.level / 100) * 1.7;
        for (let b = 0; b < nBars; b++) for (let j = 0; j < 4; j++) {
          const p = b * barN + Math.round(((j + 0.5) * barN) / 4);
          for (let i = 0; i < h.length && p + i < N; i++) { L[i + p] += h[i] * hg * 0.9; R[i + p] += h[i] * hg; }
        }
      }
      if (on('lead') && P.lead.level > 0) {
        const [ll, lr] = synthLead(P, sr, N, barN, P.tune.key);
        for (let i = 0; i < N; i++) { const g = duck ? 0.45 + 0.55 * duck[i] : 1; L[i] += ll[i] * g; R[i] += lr[i] * g; }
      }
      if (on('glue')) { // compresor de bus + clipper
        const G = P.glue, aA = Math.exp(-1 / ((G.att / 1000) * sr)), aR = Math.exp(-1 / ((G.rel / 1000) * sr));
        let env = 0;
        for (let i = 0; i < N; i++) {
          const x = Math.max(Math.abs(L[i]), Math.abs(R[i]));
          env = x > env ? aA * env + (1 - aA) * x : aR * env + (1 - aR) * x;
          const over = toDb(env) - G.thr, gr = over > 0 ? over * (1 - 1 / G.ratio) : 0;
          const g = db(-gr + Math.max(0, -G.thr) * (1 - 1 / G.ratio) * 0.35);
          L[i] *= g; R[i] *= g;
        }
        const cg = db(G.clip), c = CEIL;
        const clipFn = G.cmode === 'soft' ? (v) => c * Math.tanh((v * cg) / c) : (v) => clamp(v * cg, -c, c);
        oversampled(L, 2, clipFn, sr); oversampled(R, 2, clipFn, sr);
      }
    }
    // gain staging: sin el bus de pegamento, la mezcla deja 3 dB de margen
    if (!(mode === 'full' && on('glue'))) for (let i = 0; i < N; i++) { L[i] *= 0.7; R[i] *= 0.7; }
    const limGR = limiter(L, R, CEIL, sr);
    // el compás estable: el penúltimo (el limitador ya vio el golpe siguiente)
    const s0 = (nBars - 2) * barN, s1 = s0 + barN;
    const bL = L.slice(s0, s1), bR = R.slice(s0, s1);
    let pk = 0; for (let i = 0; i < barN; i++) pk = Math.max(pk, Math.abs(bL[i]), Math.abs(bR[i]));
    const res = {
      L: bL, R: bR, sr, bpm, barN, beatPos, kick,
      rumble: rum ? [rum[0].slice(s0, s1), rum[1].slice(s0, s1)] : null,
      meters: { peakDb: toDb(pk), lufs: lufs(bL, bR, sr), kickMs: kick.lenMs, beatMs: beatSec * 1000, f0: kick.f0, limGR },
    };
    return res;
  }

  // kick solo para exportar: con el limitador de protección
  function kickOneShot(P, mods, sr, bpm) {
    const k = synthKick(P, mods, sr, bpm), d = k.data.slice();
    limiter(d, null, CEIL, sr);
    return d;
  }

  /* ---------- análisis ---------- */
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = -TAU / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const a = i + k, b = a + len / 2;
          const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
          re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
          const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
        }
      }
    }
  }
  // espectro de potencia de un tramo (ventana de Hann, con relleno de ceros)
  function powerSpectrum(x, sr, t0, t1, size) {
    size = size || 32768;
    const a = Math.floor(t0 * sr), b = Math.min(x.length, Math.floor(t1 * sr)), n = b - a;
    const re = new Float64Array(size), im = new Float64Array(size);
    for (let i = 0; i < n && i < size; i++) re[i] = x[a + i] * (0.5 - 0.5 * Math.cos((TAU * i) / (n - 1)));
    fft(re, im);
    const p = new Float64Array(size / 2);
    for (let i = 0; i < size / 2; i++) p[i] = re[i] * re[i] + im[i] * im[i];
    return { p, df: sr / size };
  }
  function domFreq(x, sr, t0, t1, fmin, fmax) {
    const { p, df } = powerSpectrum(x, sr, t0, t1);
    let bi = 0, bv = -1;
    for (let i = Math.ceil((fmin || 20) / df); i < Math.min(p.length, (fmax || 2000) / df); i++) if (p[i] > bv) { bv = p[i]; bi = i; }
    return bi * df;
  }
  function bandsDb(x, sr, t0, t1) {
    const { p, df } = powerSpectrum(x, sr, t0, t1), out = [];
    for (let f = 25; f < 14000; f *= Math.pow(2, 1 / 3)) {
      const lo = f / Math.pow(2, 1 / 6), hi = f * Math.pow(2, 1 / 6);
      let s = 0; for (let i = Math.floor(lo / df); i < Math.ceil(hi / df) && i < p.length; i++) s += p[i];
      out.push(10 * Math.log10(s + 1e-20));
    }
    const mx = Math.max(...out);
    return out.map((v) => Math.max(-60, v - mx));
  }
  function envDb(x, sr, ms, total) {
    const w = Math.round((ms / 1000) * sr), n = Math.floor((total / 1000) * sr / w), out = [];
    let mx = 1e-9;
    for (let k = 0; k < n; k++) { let s = 0; for (let i = k * w; i < (k + 1) * w; i++) { const v = i < x.length ? x[i] : 0; s += v * v; } out.push(Math.sqrt(s / w)); mx = Math.max(mx, out[k]); }
    return out.map((v) => Math.max(-60, toDb(v / mx)));
  }
  // juez del reto de oído: espectro, ataque y envolvente → 0-100
  function judge(a, b, sr) {
    const md = (u, v) => u.reduce((s, x, i) => s + Math.abs(x - v[i]), 0) / u.length;
    const sc = (d, k) => Math.round(clamp(100 * Math.exp(-d / k), 0, 100));
    const spec = sc(md(bandsDb(a, sr, 0, 0.6), bandsDb(b, sr, 0, 0.6)), 9);
    const att = sc(md(bandsDb(a, sr, 0, 0.03), bandsDb(b, sr, 0, 0.03)), 9);
    const env = sc(md(envDb(a, sr, 5, 600), envDb(b, sr, 5, 600)), 8);
    return { spec, att, env, total: Math.round(spec * 0.4 + att * 0.3 + env * 0.3) };
  }

  /* ---------- WAV 24 bit ---------- */
  function wav(chans, sr) {
    const nc = chans.length, n = chans[0].length, bps = 3, data = n * nc * bps;
    const buf = new ArrayBuffer(44 + data), v = new DataView(buf);
    const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); v.setUint32(4, 36 + data, true); str(8, 'WAVE'); str(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, nc, true); v.setUint32(24, sr, true);
    v.setUint32(28, sr * nc * bps, true); v.setUint16(32, nc * bps, true); v.setUint16(34, 24, true);
    str(36, 'data'); v.setUint32(40, data, true);
    let o = 44;
    for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) {
      const s = Math.round(clamp(chans[c][i], -1, 1) * 8388607);
      v.setUint8(o, s & 255); v.setUint8(o + 1, (s >> 8) & 255); v.setUint8(o + 2, (s >> 16) & 255); o += 3;
    }
    return new Blob([buf], { type: 'audio/wav' });
  }

  KL.dsp = {
    db, toDb, clamp, CEIL, NOTE_NAMES, noteFreq, freqToNote, keyFreq, Biquad, shaper, kickPlan, synthKick,
    renderMix, kickOneShot, duckGain, synthHat, synthLead, makeIR, domFreq, bandsDb, envDb, judge, wav, lufs, powerSpectrum, DIVS,
  };
})();
