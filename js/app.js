/* KICK LAB · aplicación */
(function () {
  'use strict';
  const KL = window.KL, ui = KL.ui, dsp = KL.dsp, M = KL.MODULES, LV = KL.LEVELS;
  const $ = (s, r) => (r || document).querySelector(s);
  const STORE = 'kicklab.v1';
  const clone = (o) => JSON.parse(JSON.stringify(o));

  /* ---------- estado ---------- */
  function freshState() {
    return { level: 1, maxLevel: 1, passed: {}, skipped: {}, P: KL.defaultParams(), bpm: 150, vol: 0.7, waves: ['sine'], bypass: [], presetHeard: false, exported: false, savedPreset: false, presets: {}, seen: [1] };
  }
  function load() {
    const S = freshState();
    try {
      const raw = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (raw && raw.P) {
        Object.assign(S, raw);
        const def = KL.defaultParams();
        for (const m in def) S.P[m] = Object.assign({}, def[m], raw.P[m] || {});
      }
    } catch (e) { /* estado corrupto: parte de cero */ }
    S.level = Math.min(Math.max(1, S.level | 0), 15);
    return S;
  }
  let S = load();
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { /* sin almacenamiento */ } };

  // estado de sesión (no se guarda)
  const T = { ab: false, ear: null, res: null, ghost: null, audio: null, playing: false, holdSpec: [], spBuf: {}, beats: [], lastPass: 0 };

  const level = () => LV[S.level - 1];

  /* ---------- qué módulos suenan ---------- */
  function modsFor(lv, opts) {
    opts = opts || {};
    const set = new Set();
    for (const [id, m] of Object.entries(M)) if (m.lvl <= lv && !(opts.noBypass ? false : S.bypass.includes(id))) set.add(id);
    if (opts.kickOnly) for (const id of [...set]) if (M[id].row) set.delete(id);
    return set;
  }
  function currentSource() {
    const L = level();
    if (T.ear) {
      const kickMods = modsFor(S.level, { kickOnly: true });
      return { P: T.ear.listen === 'target' ? T.ear.target : S.P, mods: kickMods, mode: 'kick', mine: false };
    }
    if (S.level === 14 && T.ab) {
      const P = Object.assign(clone(S.P), clone(KL.PRESET_BRUTAL.P));
      return { P, mods: modsFor(14, { noBypass: true }), mode: 'full', mine: false };
    }
    const mods = modsFor(S.level);
    if (T.ab && S.level < 14) L.mods.forEach((m) => mods.delete(m));
    return { P: S.P, mods, mode: 'full', mine: !T.ab };
  }

  /* ---------- audio en vivo ---------- */
  const sr = () => (T.audio ? T.audio.ctx.sampleRate : 48000);
  function initAudio() {
    if (T.audio) return T.audio;
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC({ latencyHint: 'interactive' });
    const bus = ctx.createGain();
    const an = ctx.createAnalyser(); an.fftSize = 16384; an.smoothingTimeConstant = 0.55; an.minDecibels = -110; an.maxDecibels = 0;
    const an2 = ctx.createAnalyser(); an2.fftSize = 8192; an2.smoothingTimeConstant = 0.2;
    const vol = ctx.createGain(); vol.gain.value = S.vol;
    bus.connect(an); bus.connect(an2); bus.connect(vol); vol.connect(ctx.destination);
    T.audio = { ctx, bus, an, an2, vol, next: 0, idx: 0, timer: null, loop: null };
    return T.audio;
  }
  function setLoop(res) {
    const A = T.audio; if (!A) return;
    const buf = A.ctx.createBuffer(2, res.barN, res.sr);
    buf.copyToChannel(res.L, 0); buf.copyToChannel(res.R, 1);
    A.loop = { buf, beatPos: res.beatPos, sr: res.sr };
  }
  function tick() {
    const A = T.audio; if (!A || !A.loop || !T.playing) return;
    const ahead = document.hidden ? 1.2 : 0.14;
    while (A.next < A.ctx.currentTime + ahead) {
      const L = A.loop, j = A.idx % 4, off = L.beatPos[j] / L.sr, dur = (L.beatPos[j + 1] - L.beatPos[j]) / L.sr;
      const src = A.ctx.createBufferSource(); src.buffer = L.buf; src.connect(A.bus);
      src.start(A.next, off, dur);
      T.beats.push({ t: A.next, dur, j });
      if (T.beats.length > 16) T.beats.shift();
      A.next += dur; A.idx++;
    }
  }
  function play(on) {
    const A = initAudio();
    if (on == null) on = !T.playing;
    T.playing = on;
    if (on) {
      A.ctx.resume();
      A.next = A.ctx.currentTime + 0.08; A.idx = 0; T.beats = [];
      clearInterval(A.timer); A.timer = setInterval(tick, 25); tick();
    } else {
      clearInterval(A.timer);
    }
    document.body.classList.toggle('playing', on);
    $('#play').setAttribute('aria-pressed', on);
  }

  /* ---------- render ---------- */
  let busy = false, again = false, deb = null;
  function requestRender(fast) { clearTimeout(deb); deb = setTimeout(doRender, fast ? 0 : 35); }
  async function doRender() {
    if (busy) { again = true; return; }
    busy = true;
    try {
      const src = currentSource();
      const res = await dsp.renderMix(src.P, src.mods, S.bpm, sr(), src.mode);
      res.mine = src.mine;
      T.res = res;
      setLoop(res);
      paintMeters();
      evaluate();
    } catch (e) { console.error(e); }
    busy = false;
    if (again) { again = false; doRender(); }
    else if (T.onRender && T.res) T.onRender(T.res);
  }

  /* ---------- retos ---------- */
  function ctxForCheck() { return { waves: S.waves, bpm: S.bpm, presetHeard: S.presetHeard, exported: S.exported, savedPreset: S.savedPreset }; }
  function evaluate() {
    const L = level();
    const meters = T.res && T.res.mine ? T.res.meters : null;
    if (L.n === 13 && !meters) return paintTask(null);
    const ok = !!L.check(S.P, ctxForCheck(), meters);
    const fresh = ok && !S.passed[L.n];
    if (fresh) {
      S.passed[L.n] = true;
      S.maxLevel = Math.max(S.maxLevel, Math.min(15, L.n + 1));
      save();
      paintNav();
    }
    paintTask(ok);
    if (fresh) {
      toast(L.n < 15 ? `✓ Reto cumplido. Nivel ${L.n + 1} desbloqueado` : '✓ Curso completo. Ya diseñas kicks desde cero.', true);
    }
  }
  function paintTask(ok) {
    const box = $('#task'), L = level();
    box.classList.toggle('ok', !!ok);
    $('#taskLed').className = 'led ' + (ok ? 'on' : 'red');
    $('#taskState').textContent = ok ? 'Cumplido' : 'En curso';
    const prog = L.progress ? L.progress(S.P, ctxForCheck()) : '';
    $('#taskProg').textContent = prog;
    if (L.n === 13 && T.res && T.res.mine) $('#taskProg').textContent = `Loudness actual: ${T.res.meters.lufs.toFixed(1).replace('.', ',')} LUFS`;
    const done = S.passed[L.n] || S.skipped[L.n];
    $('#next').disabled = L.n >= 15 || !done;
    $('#skip').hidden = L.n >= 15 || !!done;
  }

  /* ---------- pintar ---------- */
  function paintMeters() {
    const r = T.res; if (!r) return;
    const m = r.meters, n = dsp.freqToNote(m.f0);
    const f1 = (x) => x.toFixed(1).replace('.', ',');
    $('#mPeak').textContent = f1(m.peakDb);
    $('#mLufs').textContent = f1(m.lufs);
    $('#mNote').textContent = n.name;
    $('#mNoteSub').textContent = `${f1(m.f0)} Hz ${n.cents >= 0 ? '+' : ''}${n.cents}¢`;
    $('#mTail').textContent = Math.round(m.kickMs);
    $('#mTailSub').textContent = `de ${Math.round(m.beatMs)} ms`;
    const over = m.kickMs > m.beatMs * 0.97;
    $('#mTailBox').classList.toggle('warn', over);
    $('#mGr').textContent = f1(m.limGR);
    $('#srcTag').textContent = T.ear ? (T.ear.listen === 'target' ? 'SONANDO: OBJETIVO' : 'SONANDO: TU KICK') : T.ab ? (S.level === 14 ? 'SONANDO: PRESET BERLÍN 155' : 'SONANDO: B · SIN EL MÓDULO NUEVO') : 'SONANDO: A · TU CADENA';
    $('#srcTag').classList.toggle('alt', !!(T.ab || (T.ear && T.ear.listen === 'target')));
  }

  function paintNav() {
    const nav = $('#levelNav'); nav.innerHTML = '';
    LV.forEach((L) => {
      const b = ui.h('button', 'lv', `<span>${String(L.n).padStart(2, '0')}</span>`);
      b.type = 'button'; b.title = `${L.n}. ${L.title}`;
      if (L.n === S.level) b.classList.add('cur');
      if (S.passed[L.n]) b.classList.add('done'); else if (S.skipped[L.n]) b.classList.add('skip');
      if (L.n > S.maxLevel) { b.classList.add('lock'); b.disabled = true; }
      b.onclick = () => goLevel(L.n);
      nav.appendChild(b);
    });
    const pct = (Object.keys(S.passed).length / 15) * 100;
    $('#progFill').style.width = pct + '%';
  }

  function paintChain(fresh) {
    ui.chain($('#chain'), {
      level: S.level, bypass: new Set(S.bypass), fresh: fresh || [],
      onToggle: (id) => { toggleBypass(id); },
      onJump: (n) => { if (n <= S.maxLevel) goLevel(n); else toast(`Ese módulo llega en el nivel ${n}. Sigue subiendo.`); },
    });
  }
  function toggleBypass(id) {
    const i = S.bypass.indexOf(id);
    if (i >= 0) S.bypass.splice(i, 1); else S.bypass.push(id);
    save(); paintChain(); paintRackLeds(); requestRender(true);
  }

  function paintLesson() {
    const L = level();
    $('#lvNum').textContent = String(L.n).padStart(2, '0');
    $('#lvKicker').textContent = L.kicker;
    $('#lvTitle').textContent = L.title;
    $('#lvConcept').innerHTML = L.concept;
    $('#lvWhy').innerHTML = L.why;
    $('#lvTip').innerHTML = L.tip || '';
    $('#lvTip').hidden = !L.tip;
    $('#taskText').innerHTML = L.task;
    const names = L.mods.map((m) => M[m].name).join(' + ');
    const ab = $('#ab');
    ab.hidden = L.n >= 15;
    if (L.n === 14) { $('#abA').textContent = 'TU KICK'; $('#abB').textContent = 'PRESET'; }
    else { $('#abA').textContent = 'A · CON ' + names; $('#abB').textContent = 'B · SIN'; }
    ab.classList.toggle('b', T.ab);
    $('#sugg').hidden = L.n >= 15;
    $('#sugg').textContent = L.n === 14 ? 'Copiar preset a mis perillas' : 'Valores sugeridos';
    $('#earBtn').hidden = L.n < 5;
    $('#studio').hidden = L.n !== 15;
    document.body.dataset.level = L.n;
    document.body.classList.toggle('rumble', L.n >= 10);
    paintTask(false);
    evaluate();
  }

  /* ---------- rack de módulos ---------- */
  let knobs = {}, displays = {};
  function modulePanel(id, opts) {
    const def = M[id];
    const p = ui.h('section', 'panel' + (opts.fresh ? ' fresh' : '') + (opts.compact ? ' compact' : ''));
    p.dataset.mod = id;
    const off = S.bypass.includes(id);
    p.innerHTML = `<header><button class="led-btn" type="button" title="Encender / apagar (bypass)"><i class="led ${off ? '' : 'on'}"></i></button><b>${def.name}</b><span>${def.sub}</span><em>N${def.lvl}</em></header>`;
    p.querySelector('.led-btn').onclick = () => toggleBypass(id);
    if (ui.MODULE_DISPLAY.includes(id) && !opts.compact) {
      const cv = ui.h('canvas', 'mini'); p.appendChild(cv); displays[id] = cv;
    }
    const body = ui.h('div', 'controls');
    for (const [k, prm] of Object.entries(def.params)) {
      const set = (v) => {
        S.P[id][k] = v;
        if (id === 'wave' && !S.waves.includes(v)) S.waves.push(v);
        save(); requestRender(); drawDisplays();
      };
      let c;
      if (prm.type === 'sel') c = ui.seg(prm, S.P[id][k], set, id === 'wave');
      else if (prm.type === 'key') c = ui.keys(prm, S.P[id][k], set);
      else c = ui.knob(prm, S.P[id][k], set, { small: opts.compact });
      if ((id === 'drive' && (k === 'bits' || k === 'rate'))) c.el.classList.add('crush-only');
      if (id === 'osc' && S.level >= 9 && !S.bypass.includes('tune')) c.el.classList.add('overridden');
      if (id === 'amp' && k === 'decay' && S.level >= 9 && !S.bypass.includes('tune')) c.el.classList.add('overridden');
      knobs[id + '.' + k] = c;
      body.appendChild(c.el);
    }
    p.appendChild(body);
    if (id === 'drive') p.classList.toggle('is-crush', S.P.drive.mode === 'crush');
    return p;
  }
  function paintRack() {
    const rack = $('#rack'); rack.innerHTML = ''; knobs = {}; displays = {};
    const L = level();
    const order = Object.keys(M);
    if (L.n === 15) {
      rack.appendChild(ui.h('h3', 'rack-h', 'Todos los módulos'));
      const grid = ui.h('div', 'rack-grid');
      order.forEach((id) => grid.appendChild(modulePanel(id, {})));
      rack.appendChild(grid);
    } else {
      rack.appendChild(ui.h('h3', 'rack-h', L.mods.length > 1 ? 'Módulos nuevos' : 'Módulo nuevo'));
      const grid = ui.h('div', 'rack-grid fresh-grid');
      L.mods.forEach((id) => grid.appendChild(modulePanel(id, { fresh: true })));
      rack.appendChild(grid);
      const prev = order.filter((id) => M[id].lvl < L.n);
      if (prev.length) {
        const det = ui.h('details', 'prev');
        det.open = !!T.prevOpen;
        det.ontoggle = () => { T.prevOpen = det.open; if (det.open) drawDisplays(); };
        det.appendChild(ui.h('summary', null, `Módulos anteriores <small>${prev.length} · tus ajustes se conservan</small>`));
        const g2 = ui.h('div', 'rack-grid');
        prev.forEach((id) => g2.appendChild(modulePanel(id, { compact: false })));
        det.appendChild(g2);
        rack.appendChild(det);
      }
    }
    requestAnimationFrame(drawDisplays);
  }
  function paintRackLeds() {
    document.querySelectorAll('.panel').forEach((p) => {
      const off = S.bypass.includes(p.dataset.mod);
      p.querySelector('.led').classList.toggle('on', !off);
      p.classList.toggle('off', off);
    });
  }
  function drawDisplays() {
    const src = currentSource();
    for (const [id, cv] of Object.entries(displays)) if (cv.offsetParent) ui.drawModule(id, cv, src.P, src.mods.size ? src.mods : modsFor(S.level), S.bpm, sr());
    const dp = document.querySelector('.panel[data-mod="drive"]');
    if (dp) dp.classList.toggle('is-crush', S.P.drive.mode === 'crush');
  }
  function syncKnobs() {
    for (const [key, c] of Object.entries(knobs)) { const [m, k] = key.split('.'); c.set(S.P[m][k]); }
    drawDisplays();
  }

  /* ---------- navegación ---------- */
  function goLevel(n, opts) {
    n = Math.max(1, Math.min(15, n));
    if (n > S.maxLevel && !(opts && opts.force)) return;
    const first = !S.seen.includes(n);
    S.level = n; T.ab = false; T.ear = null; paintEar();
    if (first) S.seen.push(n);
    save();
    paintNav(); paintChain(LV[n - 1].mods.concat(n === 9 ? ['tune'] : [])); paintLesson(); paintRack(); paintGloss();
    requestRender(true);
    if (window.innerWidth < 900 && !(opts && opts.quiet)) $('#chain').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function applySuggested() {
    const L = level();
    if (L.n === 14) {
      const B = KL.PRESET_BRUTAL;
      for (const m in B.P) Object.assign(S.P[m], clone(B.P[m]));
      S.bpm = B.bpm; bpmKnob.set(S.bpm);
    } else {
      L.mods.forEach((id) => { for (const [k, p] of Object.entries(M[id].params)) if (p.best != null) S.P[id][k] = p.best; });
    }
    save(); syncKnobs(); requestRender(true);
    toast(L.n === 14 ? 'Preset Berlín 155 copiado a tus perillas' : 'Valores sugeridos aplicados. Ahora muévelos y escucha qué cambia.');
  }

  /* ---------- glosario ---------- */
  function paintGloss() {
    const list = $('#glossList'), q = ($('#glossQ').value || '').toLowerCase();
    list.innerHTML = '';
    let count = 0;
    LV.filter((L) => L.n <= Math.max(S.level, ...S.seen)).forEach((L) => {
      const items = L.gloss.filter(([t, d]) => !q || (t + d).toLowerCase().includes(q));
      if (!items.length) return;
      list.appendChild(ui.h('h4', null, `Nivel ${L.n} · ${L.title}`));
      items.forEach(([t, d]) => { count++; list.appendChild(ui.h('dl', L.n === S.level ? 'new' : '', `<dt>${t}</dt><dd>${d}</dd>`)); });
    });
    const total = LV.filter((L) => L.n <= Math.max(S.level, ...S.seen)).reduce((a, L) => a + L.gloss.length, 0);
    $('#glossCount').textContent = total;
  }

  /* ---------- reto de oído ---------- */
  function randomTarget() {
    const P = clone(S.P), r = (a, b) => a + Math.random() * (b - a), rl = (a, b) => a * Math.pow(b / a, Math.random());
    const on = modsFor(S.level, { kickOnly: true });
    if (!on.has('tune')) P.osc.freq = rl(42, 70);
    else { P.tune.key = Math.floor(Math.random() * 12); P.tune.len = r(65, 95); }
    if (on.has('amp')) { P.amp.attack = r(0, 2); P.amp.hold = r(5, 80); P.amp.decay = rl(120, 600); P.amp.curve = r(1.5, 5); }
    if (on.has('pitch')) { P.pitch.start = rl(120, 500); P.pitch.time = rl(15, 120); P.pitch.curve = r(1.5, 6); }
    if (on.has('wave')) P.wave.type = 'sine';
    if (on.has('click')) { P.click.noise = r(0, 55); P.click.nfreq = rl(1500, 8000); P.click.ndecay = rl(4, 30); P.click.tone = r(0, 40); P.click.tdecay = rl(1.5, 10); }
    if (on.has('filter')) { P.filter.type = 'lp'; P.filter.cutoff = rl(800, 12000); P.filter.env = r(0, 4); P.filter.q = rl(0.6, 3); }
    if (on.has('drive')) { P.drive.mode = Math.random() < 0.5 ? 'soft' : 'hard'; P.drive.drive = r(0, 26); P.drive.mix = r(50, 100); }
    return P;
  }
  function paintEar() {
    const E = T.ear, box = $('#ear');
    box.hidden = !E;
    document.body.classList.toggle('ear-on', !!E);
    if (!E) return;
    $('#earT').classList.toggle('on', E.listen === 'target');
    $('#earM').classList.toggle('on', E.listen === 'mine');
    const sc = E.score;
    $('#earScore').textContent = sc ? sc.total : '–';
    ['spec', 'att', 'env'].forEach((k) => { $('#earBar_' + k).style.width = (sc ? sc[k] : 0) + '%'; $('#earVal_' + k).textContent = sc ? sc[k] : '–'; });
    $('#earHint').innerHTML = sc ? earHint(sc) : 'Escucha el <b>objetivo</b>, cambia a <b>tu kick</b> y mueve las perillas hasta que suenen igual. Después pide el veredicto.';
  }
  function earHint(sc) {
    if (sc.total >= 90) return '<b>Oído de productor.</b> Casi idéntico.';
    const worst = [['spec', 'El color general (espectro) es lo más distinto: revisa frecuencia, drive y filtro.'], ['att', 'El ataque es lo más distinto: revisa el punch del pitch y el click.'], ['env', 'La forma en el tiempo es lo más distinta: revisa decay, hold y curva.']].sort((a, b) => sc[a[0]] - sc[b[0]])[0];
    return (sc.total >= 70 ? '<b>Bien cerca.</b> ' : '') + worst[1];
  }
  function earOpen() {
    T.ab = false; $('#ab').classList.remove('b');
    T.ear = { target: randomTarget(), listen: 'target', score: null };
    paintEar(); requestRender(true);
    if (!T.playing) play(true);
  }
  function earJudge() {
    const E = T.ear; if (!E) return;
    const mods = modsFor(S.level, { kickOnly: true }), s = sr();
    const a = dsp.synthKick(E.target, mods, s, S.bpm).data, b = dsp.synthKick(S.P, mods, s, S.bpm).data;
    E.score = dsp.judge(a, b, s);
    paintEar();
  }

  /* ---------- estudio: presets y exportación ---------- */
  function paintPresets() {
    const list = $('#presetList'); list.innerHTML = '';
    const names = Object.keys(S.presets);
    if (!names.length) list.appendChild(ui.h('li', 'empty', 'Todavía no guardas presets.'));
    names.forEach((nm) => {
      const li = ui.h('li', null, `<span>${nm.replace(/</g, '&lt;')}</span><small>${S.presets[nm].bpm} BPM · ${KL.KEYS[S.presets[nm].P.tune.key]}</small>`);
      const ld = ui.h('button', 'mini-b', 'Cargar'); ld.type = 'button';
      ld.onclick = () => { const pr = S.presets[nm]; for (const m in pr.P) Object.assign(S.P[m], clone(pr.P[m])); S.bpm = pr.bpm; bpmKnob.set(S.bpm); save(); syncKnobs(); requestRender(true); toast('Preset cargado: ' + nm); };
      const del = ui.h('button', 'mini-b ghost', '✕'); del.type = 'button'; del.title = 'Borrar';
      del.onclick = () => { delete S.presets[nm]; save(); paintPresets(); };
      li.append(ld, del); list.appendChild(li);
    });
  }
  function savePreset() {
    const inp = $('#presetName');
    const nm = (inp.value || '').trim() || `Kick ${KL.KEYS[S.P.tune.key]} ${S.bpm}`;
    S.presets[nm] = { P: clone(S.P), bpm: S.bpm };
    S.savedPreset = true; inp.value = '';
    save(); paintPresets(); evaluate(); toast('Preset guardado: ' + nm);
  }
  async function exportWav(kind, download) {
    const s = sr(), mods = modsFor(S.level);
    let blob, name;
    const tag = `${KL.KEYS[S.P.tune.key]}_${S.bpm}bpm`;
    if (kind === 'kick') {
      blob = dsp.wav([dsp.kickOneShot(S.P, mods, s, S.bpm)], s); name = `kicklab_kick_${tag}.wav`;
    } else {
      const r = await dsp.renderMix(S.P, mods, S.bpm, s, kind === 'rumble' ? 'rumble' : 'full');
      const rep = (x) => { const o = new Float32Array(x.length * 4); for (let i = 0; i < 4; i++) o.set(x, i * x.length); return o; };
      blob = dsp.wav([rep(r.L), rep(r.R)], s); name = `kicklab_${kind}_4compases_${tag}.wav`;
    }
    if (download !== false) {
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    }
    if (kind === 'kick') { S.exported = true; save(); evaluate(); }
    toast('WAV exportado: ' + name);
    return { blob, name };
  }

  /* ---------- avisos ---------- */
  let toastT = null;
  function toast(msg, good) {
    const t = $('#toast'); t.textContent = msg; t.className = 'toast show' + (good ? ' good' : '');
    clearTimeout(toastT); toastT = setTimeout(() => (t.className = 'toast'), 3200);
  }

  /* ---------- animación: pantallas en vivo ---------- */
  function frame() {
    requestAnimationFrame(frame);
    const A = T.audio;
    let phase = -1;
    if (A && T.playing) {
      const now = A.ctx.currentTime - (A.ctx.outputLatency || 0) - (A.ctx.baseLatency || 0);
      for (let i = T.beats.length - 1; i >= 0; i--) {
        const b = T.beats[i];
        if (b.t <= now) { phase = (now - b.t) / b.dur; if (phase <= 1) { const led = $('#beatLed'); led.classList.toggle('hit', phase < 0.18); } break; }
      }
    }
    ui.drawScope($('#scope'), T.res, phase > 1 ? -1 : phase);
    ui.drawSpectrum($('#spec'), A && T.playing ? A.an : null, sr(), T.holdSpec);
    if (S.level >= 10) ui.drawSpectrogram($('#sgram'), A && T.playing ? A.an2 : null, sr(), T.spBuf);
  }

  /* ---------- arranque ---------- */
  let bpmKnob, volKnob;
  function boot() {
    bpmKnob = ui.knob({ l: 'BPM', min: 120, max: 175, def: 150, u: '', sc: 'lin', d: 0, step: 1 }, S.bpm, (v) => { S.bpm = v; save(); requestRender(); drawDisplays(); evaluate(); }, { small: true });
    $('#bpmKnob').appendChild(bpmKnob.el);
    volKnob = ui.knob({ l: 'Volumen', min: 0, max: 100, def: 70, u: '%', sc: 'lin', d: 0 }, S.vol * 100, (v) => { S.vol = v / 100; save(); if (T.audio) T.audio.vol.gain.setTargetAtTime(S.vol, T.audio.ctx.currentTime, 0.02); }, { small: true });
    $('#volKnob').appendChild(volKnob.el);

    $('#play').onclick = () => play();
    $('#fab').onclick = () => play();
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !/INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement.tagName) && !document.activeElement.classList.contains('knob')) { e.preventDefault(); if ($('#gate').hidden) play(); }
    });
    $('#enter').onclick = () => { $('#gate').classList.add('out'); setTimeout(() => ($('#gate').hidden = true), 600); initAudio(); requestRender(true); play(true); };
    $('#ab').onclick = () => {
      if (T.ear) return;
      T.ab = !T.ab; $('#ab').classList.toggle('b', T.ab);
      if (S.level === 14 && T.ab) { S.presetHeard = true; save(); }
      requestRender(true); drawDisplays();
    };
    $('#sugg').onclick = applySuggested;
    $('#next').onclick = () => goLevel(S.level + 1);
    $('#skip').onclick = () => { const n = S.level; S.skipped[n] = true; S.maxLevel = Math.max(S.maxLevel, n + 1); save(); goLevel(n + 1); };
    $('#glossBtn').onclick = () => document.body.classList.toggle('gloss-open');
    $('#glossClose').onclick = () => document.body.classList.remove('gloss-open');
    $('#glossQ').oninput = paintGloss;
    $('#earBtn').onclick = earOpen;
    $('#earNew').onclick = earOpen;
    $('#earT').onclick = () => { T.ear.listen = 'target'; paintEar(); requestRender(true); };
    $('#earM').onclick = () => { T.ear.listen = 'mine'; paintEar(); requestRender(true); };
    $('#earJudge').onclick = earJudge;
    $('#earReveal').onclick = () => { if (!T.ear) return; for (const m in T.ear.target) Object.assign(S.P[m], clone(T.ear.target[m])); save(); syncKnobs(); earJudge(); toast('Así era el objetivo. Escúchalo con calma.'); };
    $('#earClose').onclick = () => { T.ear = null; paintEar(); requestRender(true); };
    $('#presetSave').onclick = savePreset;
    $('#presetBrutal').onclick = () => { const B = KL.PRESET_BRUTAL; for (const m in B.P) Object.assign(S.P[m], clone(B.P[m])); S.bpm = B.bpm; bpmKnob.set(S.bpm); save(); syncKnobs(); requestRender(true); toast('Preset Berlín 155 cargado'); };
    document.querySelectorAll('[data-export]').forEach((b) => (b.onclick = () => exportWav(b.dataset.export)));
    $('#reset').onclick = () => { if (confirm('¿Borrar todo tu avance y volver al nivel 1?')) { localStorage.removeItem(STORE); S = freshState(); bpmKnob.set(S.bpm); goLevel(1); } };
    window.addEventListener('resize', () => requestAnimationFrame(drawDisplays));

    paintPresets();
    goLevel(S.level, { quiet: true });
    requestAnimationFrame(frame);
  }

  /* ---------- API para pruebas automáticas ---------- */
  KL.api = {
    state: () => S,
    goLevel: (n) => { S.maxLevel = Math.max(S.maxLevel, n); goLevel(n, { force: true, quiet: true }); },
    applySuggested,
    // todos los módulos hasta el nivel n con sus valores sugeridos (o los iniciales)
    async renderLevel(n, suggested) {
      const P = KL.defaultParams();
      if (suggested) for (const [id, m] of Object.entries(M)) if (m.lvl <= n) for (const [k, p] of Object.entries(m.params)) if (p.best != null) P[id][k] = p.best;
      const mods = new Set(Object.keys(M).filter((id) => M[id].lvl <= n));
      const r = await dsp.renderMix(P, mods, 150, 48000, 'full');
      const k = r.kick.data, s = r.sr;
      let rms = 0; for (let i = 0; i < r.L.length; i++) rms += r.L[i] * r.L[i];
      rms = Math.sqrt(rms / r.L.length);
      const out = { n, peakDb: r.meters.peakDb, lufs: r.meters.lufs, rmsDb: dsp.toDb(rms), kickMs: r.meters.kickMs, f0: r.meters.f0,
        domStart: dsp.domFreq(k, s, 0, 0.012, 20, 2000), domEnd: dsp.domFreq(k, s, 0.1, 0.2, 20, 2000),
        check: LV[n - 1].check(P, { waves: ['sine', 'tri', 'saw', 'square', 'noise'], bpm: 150, presetHeard: true, exported: true, savedPreset: true }, r.meters) };
      if (r.rumble) {
        const rr = r.rumble[0], b = r.beatPos[1], seg = (a, z) => { let e = 0; for (let i = a; i < z; i++) e += rr[i] * rr[i]; return Math.sqrt(e / (z - a)); };
        out.limGR = r.meters.limGR; out.rumbleOnKick = dsp.toDb(seg(0, Math.round(0.02 * s)));
        out.rumbleOffbeat = dsp.toDb(seg(Math.round(b * 0.55), Math.round(b * 0.95)));
      }
      return out;
    },
    async exportBytes(kind) { const { blob } = await exportWav(kind, false); return Array.from(new Uint8Array(await blob.arrayBuffer())); },
    rendered: () => new Promise((res) => { T.onRender = (r) => { T.onRender = null; res(r.meters); }; requestRender(true); }),
    earTest() { earOpen(); const tgt = clone(T.ear.target); const s = sr(), mods = modsFor(S.level, { kickOnly: true }); const a = dsp.synthKick(tgt, mods, s, 150).data; return { same: dsp.judge(a, a, s), vsMine: dsp.judge(a, dsp.synthKick(S.P, mods, s, 150).data, s) }; },
    play: (on) => play(on),
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
