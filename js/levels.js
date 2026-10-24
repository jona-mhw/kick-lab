/* KICK LAB · módulos, niveles, retos y glosario */
(function () {
  'use strict';
  const KL = (window.KL = window.KL || {});

  /* Cada parámetro: l=etiqueta, min/max/def, u=unidad, sc=escala (lin|log|pow), d=decimales,
     sug=[desde,hasta] rango sugerido (arco aqua en la perilla), best=valor de "sugeridos". */
  KL.MODULES = {
    osc: { lvl: 1, name: 'OSC', sub: 'oscilador', params: {
      freq: { l: 'Frecuencia', min: 30, max: 200, def: 110, u: 'Hz', sc: 'log', d: 1, sug: [45, 65], best: 55, note: true } } },
    amp: { lvl: 2, name: 'AMP ENV', sub: 'envolvente de volumen', params: {
      attack: { l: 'Attack', min: 0, max: 50, def: 8, u: 'ms', sc: 'pow', d: 1, sug: [0, 3], best: 0.5 },
      hold: { l: 'Hold', min: 0, max: 200, def: 40, u: 'ms', sc: 'pow', d: 0, sug: [10, 60], best: 30 },
      decay: { l: 'Decay', min: 20, max: 1500, def: 900, u: 'ms', sc: 'log', d: 0, sug: [150, 350], best: 260 },
      curve: { l: 'Curva', min: 1, max: 8, def: 1.2, u: '', sc: 'lin', d: 1, sug: [2, 4], best: 2.5 } } },
    pitch: { lvl: 3, name: 'PITCH ENV', sub: 'el punch', params: {
      start: { l: 'Frec. inicial', min: 40, max: 1000, def: 80, u: 'Hz', sc: 'log', d: 0, sug: [150, 300], best: 240 },
      time: { l: 'Caída', min: 5, max: 300, def: 160, u: 'ms', sc: 'log', d: 0, sug: [20, 90], best: 45 },
      curve: { l: 'Curva', min: 1, max: 8, def: 1, u: '', sc: 'lin', d: 1, sug: [2.5, 5], best: 3.5 } } },
    wave: { lvl: 4, chip: true, name: 'WAVE', sub: 'forma de onda', params: {
      type: { l: 'Forma', type: 'sel', def: 'sine', best: 'sine', opts: [['sine', 'Seno'], ['tri', 'Triángulo'], ['saw', 'Sierra'], ['square', 'Cuadrada'], ['noise', 'Ruido']] } } },
    click: { lvl: 5, name: 'CLICK', sub: 'transiente · top layer', params: {
      noise: { l: 'Ruido', min: 0, max: 100, def: 0, u: '%', sc: 'lin', d: 0, sug: [10, 60], best: 30 },
      nfreq: { l: 'Color ruido', min: 500, max: 12000, def: 4000, u: 'Hz', sc: 'log', d: 0, sug: [2500, 7000], best: 4500 },
      ndecay: { l: 'Decay ruido', min: 2, max: 80, def: 35, u: 'ms', sc: 'log', d: 0, sug: [5, 25], best: 12 },
      tone: { l: 'Pulso', min: 0, max: 100, def: 0, u: '%', sc: 'lin', d: 0, sug: [10, 45], best: 25 },
      tfreq: { l: 'Tono pulso', min: 500, max: 6000, def: 1800, u: 'Hz', sc: 'log', d: 0, sug: [1500, 3500], best: 2400 },
      tdecay: { l: 'Decay pulso', min: 1, max: 30, def: 14, u: 'ms', sc: 'log', d: 1, sug: [2, 8], best: 4 },
      pol: { l: 'Polaridad', type: 'sel', def: 'pos', best: 'pos', opts: [['pos', 'Normal'], ['neg', 'Invertida']] } } },
    filter: { lvl: 7, name: 'FILTER', sub: 'filtro + envolvente', params: {
      type: { l: 'Tipo', type: 'sel', def: 'lp', best: 'lp', opts: [['lp', 'Pasa bajos'], ['hp', 'Pasa altos'], ['bp', 'Pasa banda']] },
      cutoff: { l: 'Cutoff', min: 40, max: 18000, def: 18000, u: 'Hz', sc: 'log', d: 0, sug: [1000, 6000], best: 2500 },
      q: { l: 'Resonancia', min: 0.5, max: 15, def: 0.7, u: 'Q', sc: 'log', d: 1, sug: [0.7, 3], best: 1.2 },
      env: { l: 'Env amount', min: 0, max: 6, def: 0, u: 'oct', sc: 'lin', d: 1, sug: [2, 4], best: 3 },
      edecay: { l: 'Env decay', min: 5, max: 500, def: 80, u: 'ms', sc: 'log', d: 0, sug: [25, 120], best: 60 } } },
    drive: { lvl: 6, name: 'DRIVE', sub: 'saturación', params: {
      mode: { l: 'Modo', type: 'sel', def: 'soft', best: 'soft', opts: [['soft', 'Soft clip'], ['hard', 'Hard clip'], ['tube', 'Asimétrico'], ['fold', 'Foldback'], ['crush', 'Bitcrush']] },
      drive: { l: 'Drive', min: 0, max: 36, def: 0, u: 'dB', sc: 'lin', d: 1, sug: [12, 24], best: 18 },
      mix: { l: 'Mix', min: 0, max: 100, def: 50, u: '%', sc: 'lin', d: 0, sug: [70, 100], best: 85 },
      bits: { l: 'Bits', min: 2, max: 16, def: 8, u: 'bit', sc: 'lin', d: 0, step: 1 },
      rate: { l: 'Downsample', min: 1, max: 32, def: 4, u: '×', sc: 'log', d: 0, step: 1 } } },
    eq: { lvl: 8, name: 'EQ', sub: 'limpieza', params: {
      hpf: { l: 'High-pass', min: 10, max: 80, def: 10, u: 'Hz', sc: 'log', d: 0, sug: [20, 35], best: 28 },
      mudF: { l: 'Frec. barro', min: 100, max: 800, def: 300, u: 'Hz', sc: 'log', d: 0, sug: [200, 400], best: 300 },
      mud: { l: 'Barro', min: -15, max: 6, def: 0, u: 'dB', sc: 'lin', d: 1, sug: [-8, -2], best: -5 },
      presF: { l: 'Frec. presencia', min: 1000, max: 10000, def: 3500, u: 'Hz', sc: 'log', d: 0, sug: [2000, 5000], best: 3500 },
      pres: { l: 'Presencia', min: -6, max: 12, def: 0, u: 'dB', sc: 'lin', d: 1, sug: [1, 6], best: 3 } } },
    tune: { lvl: 9, chip: true, name: 'TUNE', sub: 'tonalidad + largo', params: {
      key: { l: 'Tonalidad', type: 'key', def: 5, best: 5 },
      cents: { l: 'Fino', min: -50, max: 50, def: 0, u: '¢', sc: 'lin', d: 0, sug: [-5, 5], best: 0 },
      len: { l: 'Largo', min: 40, max: 120, def: 108, u: '% pulso', sc: 'lin', d: 0, sug: [70, 92], best: 84 } } },
    verb: { lvl: 10, row: 'rumble', name: 'REVERB', sub: 'send + convolución', params: {
      send: { l: 'Send', min: 0, max: 100, def: 0, u: '%', sc: 'lin', d: 0, sug: [40, 80], best: 60 },
      decay: { l: 'Decay', min: 0.5, max: 8, def: 1.2, u: 's', sc: 'log', d: 1, sug: [2, 5], best: 3.5 },
      pre: { l: 'Pre-delay', min: 0, max: 120, def: 0, u: 'ms', sc: 'pow', d: 0, sug: [0, 30], best: 10 },
      damp: { l: 'Damping', min: 300, max: 12000, def: 6000, u: 'Hz', sc: 'log', d: 0, sug: [1500, 5000], best: 3000 },
      ret: { l: 'Retorno', min: 0, max: 150, def: 100, u: '%', sc: 'lin', d: 0, sug: [70, 120], best: 100 } } },
    rlpf: { lvl: 11, row: 'rumble', name: 'BANDA', sub: 'pasa banda del rumble', params: {
      hpf: { l: 'Pasa altos', min: 20, max: 150, def: 20, u: 'Hz', sc: 'log', d: 0, sug: [40, 70], best: 50 },
      cut: { l: 'Pasa bajos', min: 40, max: 4000, def: 4000, u: 'Hz', sc: 'log', d: 0, sug: [100, 300], best: 180 } } },
    duck: { lvl: 11, row: 'rumble', name: 'DUCK', sub: 'sidechain', params: {
      depth: { l: 'Profundidad', min: 0, max: 48, def: 0, u: 'dB', sc: 'lin', d: 0, sug: [18, 36], best: 30 },
      hold: { l: 'Hold', min: 0, max: 150, def: 0, u: 'ms', sc: 'pow', d: 0, sug: [10, 60], best: 25 },
      release: { l: 'Release', min: 20, max: 600, def: 320, u: 'ms', sc: 'log', d: 0, sug: [120, 300], best: 210 },
      shape: { l: 'Curva', min: 0.3, max: 3, def: 1, u: '', sc: 'log', d: 2, sug: [1, 2.2], best: 1.6 } } },
    rdrive: { lvl: 12, row: 'rumble', name: 'R-DRIVE', sub: 'distorsión del rumble', params: {
      drive: { l: 'Drive', min: 0, max: 30, def: 0, u: 'dB', sc: 'lin', d: 1, sug: [8, 20], best: 14 } } },
    delay: { lvl: 12, row: 'rumble', name: 'DELAY', sub: 'rumble de delay', params: {
      div: { l: 'Tiempo', type: 'sel', def: '1/16', best: '1/16', opts: [['1/16', '1/16'], ['1/8', '1/8'], ['3/16', '3/16'], ['1/4', '1/4']] },
      fb: { l: 'Feedback', min: 0, max: 85, def: 30, u: '%', sc: 'lin', d: 0, sug: [20, 50], best: 35 },
      level: { l: 'Nivel', min: 0, max: 100, def: 0, u: '%', sc: 'lin', d: 0, sug: [20, 50], best: 35 } } },
    rtune: { lvl: 12, row: 'rumble', name: 'R-TUNE', sub: 'afinación del rumble', params: {
      gain: { l: 'Realce', min: 0, max: 15, def: 0, u: 'dB', sc: 'lin', d: 1, sug: [4, 10], best: 7 },
      q: { l: 'Q', min: 1, max: 20, def: 6, u: '', sc: 'log', d: 1, sug: [4, 10], best: 6 } } },
    rclean: { lvl: 13, row: 'rumble', name: 'MONO', sub: 'graves del rumble a mono', params: {
      mono: { l: 'Mono bajo', min: 0, max: 250, def: 0, u: 'Hz', sc: 'lin', d: 0, sug: [100, 200], best: 140 } } },
    glue: { lvl: 13, row: 'master', name: 'GLUE', sub: 'compresor + clipper', params: {
      thr: { l: 'Umbral', min: -40, max: 0, def: 0, u: 'dB', sc: 'lin', d: 1, sug: [-20, -6], best: -10 },
      ratio: { l: 'Ratio', min: 1, max: 20, def: 2, u: ':1', sc: 'log', d: 1, sug: [2, 4], best: 3 },
      att: { l: 'Attack', min: 0.1, max: 50, def: 10, u: 'ms', sc: 'log', d: 1, sug: [5, 30], best: 15 },
      rel: { l: 'Release', min: 20, max: 500, def: 120, u: 'ms', sc: 'log', d: 0, sug: [60, 200], best: 120 },
      clip: { l: 'Clipper', min: 0, max: 15, def: 0, u: 'dB', sc: 'lin', d: 1, sug: [3, 9], best: 7 },
      cmode: { l: 'Clip', type: 'sel', def: 'hard', best: 'hard', opts: [['hard', 'Hard'], ['soft', 'Soft']] } } },
    hat: { lvl: 14, row: 'master', name: 'HAT', sub: 'contratiempo', params: {
      level: { l: 'Nivel', min: 0, max: 100, def: 0, u: '%', sc: 'lin', d: 0, sug: [30, 70], best: 50 },
      decay: { l: 'Decay', min: 20, max: 400, def: 120, u: 'ms', sc: 'log', d: 0, sug: [60, 180], best: 110 } } },
    lead: { lvl: 14, row: 'master', name: 'ARP', sub: 'arpegio trance (opcional)', params: {
      level: { l: 'Nivel', min: 0, max: 100, def: 0, u: '%', sc: 'lin', d: 0, sug: [0, 50], best: 30 },
      cut: { l: 'Brillo', min: 300, max: 12000, def: 2500, u: 'Hz', sc: 'log', d: 0, sug: [1200, 5000], best: 2500 } } },
  };

  // diagrama: filas y orden de las cajas (el orden es el de la señal, no el de los niveles)
  KL.CHAIN = {
    kick: ['osc', 'pitch', 'amp', 'click', 'drive', 'filter', 'eq'],
    chips: ['wave', 'tune'],
    rumble: ['send', 'delay', 'verb', 'rdrive', 'rlpf', 'rtune', 'rclean', 'duck'],
    master: ['mix', 'hat', 'lead', 'glue', 'limit', 'out'],
  };
  KL.BOX = { // cajas que no son módulos con perillas
    send: { lvl: 10, mod: 'verb', name: 'SEND', sub: 'envío' },
    mix: { lvl: 1, name: 'MIX', sub: 'bus', fixed: true },
    limit: { lvl: 1, name: 'LIMIT', sub: 'protección −1 dBFS', fixed: true },
    out: { lvl: 1, name: 'OUT', sub: 'parlantes', fixed: true },
  };

  KL.KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const inR = (v, a, b) => v >= a - 1e-9 && v <= b + 1e-9;

  KL.LEVELS = [
    { n: 1, mods: ['osc'], title: 'El seno puro', kicker: 'Todo parte de una vibración',
      concept: 'Todo kick parte de una <b>onda seno</b>: la vibración más simple que existe, una sola frecuencia sin armónicos (un <b>tono puro</b>). Piensa en un columpio que va y vuelve siempre igual: las idas y vueltas por segundo son su <b>frecuencia</b>, en <b>hercios (Hz)</b>. 55 Hz son 55 ciclos por segundo, y en el teclado eso es un <b>A1 (La, 55 Hz)</b>. Bajo ~60 Hz cuesta reconocer la nota y el sonido se empieza a sentir en el cuerpo. Esa zona se llama <b>sub</b>.',
      why: 'El kick es el corazón del techno y su trabajo es mover aire, no sonar brillante. Un seno grave pone toda su energía en una sola frecuencia, sin nada que ensucie; por eso es el <b>cuerpo (body)</b> de casi todo kick sintetizado, desde la TR-909 hasta el hard techno actual.',
      tip: 'Con el parlante del celular el sub bajo 60 Hz casi no se oye: usa audífonos o parlantes con bajo.',
      task: 'Baja el oscilador a la zona sub: <b>entre 45 y 65 Hz</b>. Mira cómo se corre el pico del espectro y qué nota marca.',
      check: (P) => inR(P.osc.freq, 45, 65),
      gloss: [['Onda seno', 'La vibración más simple: una sola frecuencia, sin armónicos. Es el cuerpo del kick.'], ['Frecuencia (Hz)', 'Ciclos por segundo. 55 Hz = 55 vueltas por segundo = A1 (La).'], ['Sub', 'Zona bajo ~60 Hz: se siente más de lo que se oye.'], ['Fundamental', 'La frecuencia más baja de un sonido; la que define su nota.']] },

    { n: 2, mods: ['amp'], title: 'Envolvente de amplitud', kicker: 'Darle forma en el tiempo',
      concept: 'Un seno que se prende y se apaga de golpe suena a pitido de microondas. Un instrumento real tiene forma en el tiempo: arranca, se sostiene y se apaga. Esa forma es la <b>envolvente de amplitud</b> (amp envelope): <b>attack</b> (cuánto tarda en llegar arriba), <b>hold</b> (cuánto se queda) y <b>decay</b> (cuánto tarda en caer a cero). Como golpear una mesa: llega al tiro y se apaga sola. En un <b>one-shot</b> nadie mantiene la tecla, así que el <b>sustain</b> y el <b>release</b> del ADSR clásico se funden en el decay.',
      why: 'El largo del kick decide el groove: una cola larga es boomy y se monta con el golpe siguiente; una corta es seca y deja espacio al bajo o al rumble. El attack casi en cero es lo que hace que pegue. La <b>curva</b> decide si la cola cae parejo (lineal) o se desinfla rápido y deja un cuerpo corto.',
      task: 'Corta la cola: <b>attack bajo 3 ms</b> y <b>decay entre 150 y 350 ms</b>, con algo de curva (2 o más).',
      check: (P) => P.amp.attack <= 3 && inR(P.amp.decay, 150, 350) && P.amp.curve >= 2,
      gloss: [['Envolvente (envelope)', 'Cómo cambia un parámetro en el tiempo después de cada golpe.'], ['ADSR', 'Attack, Decay, Sustain, Release: la envolvente clásica de un sintetizador.'], ['Attack', 'Tiempo que tarda el sonido en llegar a su máximo.'], ['Hold', 'Tiempo que se queda arriba antes de caer.'], ['Decay', 'Tiempo que tarda en caer. En un kick, el largo de la cola.'], ['One-shot', 'Sonido que se dispara entero con un golpe, sin tecla mantenida.']] },

    { n: 3, mods: ['pitch'], title: 'Envolvente de pitch: el punch', kicker: 'Acá nace el kick',
      concept: 'Si la frecuencia parte alta y cae rápido hasta el sub, el oído percibe un golpe: el <b>punch</b>. Es la <b>envolvente de pitch</b> (pitch envelope o pitch sweep): una frecuencia inicial, una final (la del oscilador) y un tiempo de caída. Como el parche de un bombo: al golpearlo se tensa, suena más agudo y en milisegundos se relaja. La <b>curva</b> decide cómo cae: una caída <b>lineal</b> o larga suena a "piu" de láser; <b>exponencial</b> cae rápido al principio y suena a golpe.',
      why: 'Casi todo kick sintetizado (la 909 y los de hard techno; en la 808 la caída de pitch es mínima) es un seno con pitch envelope. Partir sobre ~150 Hz le da al golpe un ataque que se oye hasta en parlantes chicos; el tiempo corto (20 a 90 ms) hace que se perciba como golpe y no como una nota que se desliza.',
      task: 'Deja el punch <b>entre 150 y 300 Hz</b>, una caída <b>de 20 a 90 ms</b> y una curva <b>exponencial (2,5 o más)</b>.',
      check: (P) => inR(P.pitch.start, 150, 300) && inR(P.pitch.time, 20, 90) && P.pitch.curve >= 2.5,
      gloss: [['Pitch envelope', 'Envolvente que mueve la frecuencia del oscilador: de alta a baja en milisegundos.'], ['Punch', 'La sensación de golpe que da la caída rápida de pitch.'], ['Curva exponencial', 'Cae rápido al principio y lento al final: suena a golpe. La lineal suena a láser.'], ['Body', 'El cuerpo del kick: la parte grave que queda después del golpe.']] },

    { n: 4, mods: ['wave'], title: 'Formas de onda y armónicos', kicker: 'Por qué el cuerpo queda en seno',
      concept: 'El seno tiene una sola frecuencia. Las otras formas de onda suman <b>armónicos</b>: múltiplos de la fundamental (2×, 3×, 4×…). El <b>triángulo</b> tiene pocos y suaves; la <b>cuadrada</b>, solo los impares y fuertes; la <b>sierra</b> (saw), todos, y por eso suena brillante y áspera. El <b>ruido</b> no tiene nota: es energía repartida en todas las frecuencias. Mira el espectro: cada forma dibuja su propia escalera de armónicos.',
      why: 'Se parte del seno porque es lo único que controlas del todo: los armónicos se los sumas después, a propósito, con la saturación y la capa de ataque. Partir de una sierra mete armónicos que no elegiste y se come el <b>headroom</b>. Por eso el kick se diseña <b>por capas</b>.',
      task: 'Pasa por <b>las cinco formas de onda</b> mirando el espectro y después <b>vuelve al seno</b>.',
      check: (P, S) => ['sine', 'tri', 'saw', 'square', 'noise'].every((w) => S.waves.includes(w)) && P.wave.type === 'sine',
      progress: (P, S) => `${['sine', 'tri', 'saw', 'square', 'noise'].filter((w) => S.waves.includes(w)).length}/5 formas escuchadas`,
      gloss: [['Armónicos', 'Frecuencias múltiplos de la fundamental que le dan color (timbre) al sonido.'], ['Sierra (saw)', 'Tiene todos los armónicos: brillante y áspera. La base de los leads de trance.'], ['Cuadrada (square)', 'Solo armónicos impares: hueca y fuerte.'], ['Triángulo', 'Pocos armónicos impares y suaves: casi un seno.'], ['Ruido blanco', 'Energía pareja en todas las frecuencias; no tiene nota.'], ['Timbre', 'El color de un sonido, lo que distingue una sierra de un seno en la misma nota.']] },

    { n: 5, mods: ['click'], title: 'Transiente: la capa de click', kicker: 'Top layer sobre sub layer',
      concept: 'Los primeros 5 a 20 ms de un sonido son el <b>transiente</b>: el oído lo usa para ubicar el golpe en el tiempo. El seno grave tiene poco, así que se le suma un <b>top layer</b>: una ráfaga de <b>ruido filtrado</b> (el roce del golpe) y un pulso cortísimo de <b>cuadrada</b> (el "tic" del mazo contra el parche), encima del <b>sub layer</b>. Como un bombo de verdad: el golpe del mazo más la resonancia del parche.',
      why: 'En una pista llena el sub se enmascara, y lo que te dice "acá está el kick" es el click de 2 a 5 kHz. Los productores arman ese ataque con capas cortísimas (samples o síntesis) para que el kick corte en cualquier parlante sin subirle el volumen.',
      tip: 'Si al sumar el click el golpe pierde peso, prueba la <b>polaridad</b> invertida: las capas también se cancelan entre sí (fase).',
      task: 'Arma el top layer: <b>ruido entre 10% y 60%</b> con <b>decay bajo 25 ms</b>, y el <b>pulso</b> (más de 5%) con <b>decay bajo 10 ms</b>.',
      check: (P) => inR(P.click.noise, 10, 60) && P.click.ndecay <= 25 && P.click.tone > 5 && P.click.tdecay <= 10,
      gloss: [['Transiente', 'El ataque: los primeros milisegundos de un sonido, donde el oído ubica el golpe.'], ['Top layer / sub layer', 'Capa de ataque (agudos, cortísima) sobre la capa de cuerpo (sub).'], ['Layering', 'Armar un sonido sumando capas que cumplen funciones distintas.'], ['Click', 'Pulso cortísimo y agudo que marca el inicio del kick.'], ['Polaridad y fase', 'Si dos capas suenan a la vez con la onda al revés, se restan. Invertir la polaridad de una capa puede devolverle el peso al golpe.']] },

    { n: 6, mods: ['drive'], title: 'Saturación y distorsión', kicker: 'El ADN del hard techno',
      concept: 'Saturar es empujar la onda más allá de lo que el circuito aguanta, y la forma en que se dobla crea <b>armónicos nuevos</b>. <b>Soft clip</b> (tanh) redondea las puntas: cálido, como cinta. <b>Hard clip</b> las corta en seco: agresivo, armónicos impares. El <b>waveshaper asimétrico</b> dobla distinto arriba y abajo y suma <b>armónicos pares</b>: el carácter de válvula. <b>Foldback</b> dobla la onda sobre sí misma: metálico y extremo. <b>Bitcrush</b> baja los bits y la frecuencia de muestreo: digital y roto. <b>Drive</b> es cuánto empujas; <b>mix</b>, cuánto de lo saturado sumas a lo limpio (procesamiento en paralelo).',
      why: 'El kick de hard techno es un seno con pitch envelope, destruido con gusto. La distorsión convierte el sub (que solo mueven los parlantes grandes) en armónicos de 100 a 1000 Hz que se oyen en todos lados: el kick parece más fuerte sin subir el pico. Muchos encadenan distorsión, EQ y distorsión otra vez: así sale el "tok" del hard techno. El chirrido que queda arriba lo domas en el próximo nivel con un filtro, que va <b>después</b> del drive.',
      task: 'Prueba los cinco modos. Quédate con <b>soft o hard clip</b>, <b>drive de 12 dB o más</b> y <b>mix sobre 70%</b>.',
      check: (P) => ['soft', 'hard'].includes(P.drive.mode) && P.drive.drive >= 12 && P.drive.mix >= 70,
      gloss: [['Saturación', 'Distorsión suave que agrega armónicos y densidad.'], ['Soft clip (tanh)', 'Redondea los picos: cálido, como cinta.'], ['Hard clip', 'Corta los picos en seco: agresivo, armónicos impares.'], ['Waveshaper', 'Función que transforma cada muestra según una curva; si es asimétrica crea armónicos pares.'], ['Foldback', 'Dobla la onda sobre sí misma cuando pasa el límite: metálico.'], ['Bitcrush', 'Reduce bits y frecuencia de muestreo: sonido digital y roto.'], ['Drive', 'Cuánta ganancia empuja la señal contra el saturador.'], ['Dry/wet (paralelo)', 'Mezcla entre la señal limpia y la procesada.'], ['Aliasing / oversampling', 'La distorsión crea armónicos sobre la mitad de la frecuencia de muestreo que vuelven como ruido inarmónico; los saturadores serios procesan a 4× u 8×. Acá el drive trabaja a 4×.']] },

    { n: 7, mods: ['filter'], title: 'Filtros: esculpir el brillo', kicker: 'La perilla más expresiva',
      concept: 'Un <b>filtro</b> deja pasar unas frecuencias y atenúa otras. El <b>pasa bajos</b> (low-pass, LPF) quita lo agudo; el <b>pasa altos</b> (high-pass, HPF) quita lo grave; el <b>pasa banda</b> (band-pass) deja solo una zona. El <b>cutoff</b> es la frecuencia de corte y la <b>resonancia</b> (Q) realza justo esa frecuencia hasta que silba. La <b>envolvente de filtro</b> abre el cutoff en el golpe y lo cierra en milisegundos: brillo arriba, cola oscura. Es una llave de agua, pero de frecuencias.',
      why: 'En el kick el filtro doma el top layer y el chirrido que dejó la distorsión: el golpe sale brillante y la cola queda redonda. Mover el cutoff y escuchar es el ejercicio número uno para entrenar el oído de un sintetista.',
      tip: 'Prueba: vuelve un rato a la sierra en WAVE y mueve el cutoff; ahí el filtro se oye clarito. Después vuelve al seno.',
      task: 'Elige <b>pasa bajos</b> con cutoff <b>entre 1 y 6 kHz</b> y una envolvente de <b>2 octavas o más</b>.',
      check: (P) => P.filter.type === 'lp' && inR(P.filter.cutoff, 1000, 6000) && P.filter.env >= 2,
      gloss: [['Filtro pasa bajos (LPF)', 'Deja pasar lo grave y atenúa lo agudo sobre el cutoff.'], ['Filtro pasa altos (HPF)', 'Deja pasar lo agudo y atenúa lo grave bajo el cutoff.'], ['Pasa banda (BPF)', 'Deja pasar solo una zona alrededor del cutoff.'], ['Cutoff', 'Frecuencia donde el filtro empieza a cortar.'], ['Resonancia (Q)', 'Realce justo en el cutoff. Alta = el filtro silba.'], ['Envolvente de filtro', 'Mueve el cutoff en el tiempo: abre en el golpe y cierra en la cola.']] },

    { n: 8, mods: ['eq'], title: 'EQ de limpieza', kicker: 'Restar antes de sumar',
      concept: 'La <b>ecualización</b> (EQ) sube o baja zonas del espectro. Tres movimientos clásicos en un kick: un <b>high-pass</b> a 20-35 Hz que saca lo que nadie oye pero se come headroom; un recorte de 2 a 8 dB en el <b>barro</b> (200-400 Hz), la zona que suena a cartón; y un realce en la <b>presencia</b> (2-5 kHz) para que el click corte. Como ordenar una pieza: primero botas lo que sobra.',
      why: 'La distorsión del nivel anterior llenó el medio grave de basura. Restar antes de sumar es la regla de los ingenieros de mezcla. Y todo lo grave va en <b>mono</b>: bajo ~100-150 Hz el oído no percibe dirección, y un sub en estéreo con diferencias de fase puede cancelarse cuando el club o el celular lo suman a mono. Este kick ya es mono; el rumble lo vas a cuidar en el nivel 13.',
      task: '<b>HPF entre 20 y 35 Hz</b>, <b>barro entre −2 y −8 dB</b> centrado entre 200 y 400 Hz, y <b>presencia entre +1 y +6 dB</b> entre 2 y 5 kHz.',
      check: (P) => inR(P.eq.hpf, 20, 35) && inR(P.eq.mud, -8, -2) && inR(P.eq.mudF, 200, 400) && inR(P.eq.pres, 1, 6) && inR(P.eq.presF, 2000, 5000),
      gloss: [['EQ (ecualizador)', 'Herramienta para subir o bajar zonas de frecuencia.'], ['Barro (mud)', 'Acumulación en 200-400 Hz que hace sonar todo a cartón.'], ['Presencia', 'Zona de 2-5 kHz donde el oído es más sensible: define el click.'], ['Headroom', 'Margen entre el nivel de la señal y el máximo (0 dBFS).'], ['Mono en el sub', 'Regla de mezcla: bajo ~120 Hz todo va igual en ambos canales.']] },

    { n: 9, mods: ['tune'], title: 'Afinar y cortar a tiempo', kicker: 'El kick también es una nota',
      concept: 'El kick tiene nota: la frecuencia en que termina el pitch envelope. Si el tema está en Fa menor y el kick termina en Sol, choca con el bajo y con el rumble. <b>Afinar</b> es llevar esa fundamental a la nota de la <b>tonalidad</b> (F, 43,65 Hz, es una afinación muy usada en kicks de techno). Y el largo se ajusta al <b>BPM</b>: a 150 BPM hay 400 ms entre golpes; si la cola llega al golpe siguiente, se suman y todo se embarra.',
      why: 'Los productores afinan cada kick (con un analizador o de oído) y lo recortan para que <b>respire</b>: un respiro antes del golpe siguiente hace que ese golpe pegue más. A más BPM, kick más corto: así el hard techno a 155 BPM sigue sonando apretado. Desde ahora la nota y el largo los manda TUNE.',
      task: 'Elige la nota y deja el kick <b>entre 70% y 92% del pulso</b> para que respire antes del siguiente.',
      check: (P) => inR(P.tune.len, 70, 92) && Math.abs(P.tune.cents) <= 10,
      gloss: [['Tonalidad', 'La nota base del tema (ej. Fa menor). El kick y el rumble se afinan a ella.'], ['Afinar el kick', 'Ajustar la frecuencia final del cuerpo a una nota de la tonalidad.'], ['BPM', 'Pulsos por minuto. 150 BPM = un kick cada 400 ms.'], ['Respirar', 'Dejar un espacio corto entre el fin de la cola y el golpe siguiente.']] },

    { n: 10, mods: ['verb'], title: 'Rumble I: el envío a la reverb', kicker: 'Gritar en una catedral',
      concept: 'El <b>rumble</b> es el retumbe grave y oscuro que llena el espacio entre kicks: la firma del techno industrial y del hard techno. Nace de mandar el kick a una <b>reverb</b> larga, pero sin meterla en el kick: se hace un <b>envío (send)</b>. Una copia de la señal va a un canal aparte (<b>bus de retorno</b>) donde vive la reverb, y el kick original sigue limpio. Como gritar en una catedral: tu voz sigue igual, pero la sala responde con una cola enorme. Acá la sala es una <b>respuesta al impulso (IR)</b> generada y aplicada por <b>convolución</b>.',
      why: 'Separar kick y rumble en dos canales permite procesar la cola sin tocar el golpe: filtrarla, distorsionarla y apagarla cuando el kick suena. Es la técnica base del rumble en techno industrial y hard techno.',
      task: 'Manda el kick a la reverb: <b>send sobre 40%</b> y <b>decay de 2 s o más</b>. Escucha cómo se embarra todo: lo arreglas en el próximo nivel.',
      check: (P) => P.verb.send >= 40 && P.verb.decay >= 2,
      gloss: [['Rumble', 'Cola grave, oscura y rítmica que vive entre los kicks. Firma del hard techno.'], ['Reverb', 'Simula las reflexiones de una sala: el sonido sigue sonando después del golpe.'], ['Envío (send) / retorno', 'Copia de la señal que va a un canal de efecto; el original sigue limpio.'], ['Respuesta al impulso (IR)', 'La "huella" de una sala: cómo responde a un golpe instantáneo.'], ['Convolución', 'Operación que aplica una IR a un sonido: reverb realista.'], ['Pre-delay', 'Tiempo entre el golpe y el inicio de la reverb.'], ['Damping', 'Cuánto se oscurece la cola con el tiempo.']] },

    { n: 11, mods: ['rlpf', 'duck'], title: 'Rumble II: filtrar y respirar', kicker: 'Sidechain y ducking',
      concept: 'La reverb cruda trae todo el espectro y tapa el kick. Dos pasos: un <b>pasa banda</b> (pasa altos a 40-70 Hz y pasa bajos a 100-300 Hz) deja solo la zona grave y oscura, sin pisar el sub, que es del kick; y el <b>ducking</b> por <b>sidechain</b> baja el volumen del rumble cada vez que suena el kick y lo deja volver entre golpes. Como dos personas que se turnan para hablar: el kick habla en el pulso, el rumble en el contratiempo. La <b>curva</b> del ducking (profundidad, hold, release y forma) es el groove: la respiración del hard techno.',
      why: 'Sin ducking, rumble y kick se suman en el sub y la mezcla se satura sin pegar. Con ducking cada golpe aparece sobre silencio y el rumble rellena justo donde el kick ya cayó: suena más fuerte con el mismo pico. Muchos lo hacen con un compresor con sidechain; acá lo dibujas como curva de volumen (<b>volume shaping</b>), como en LFO Tool o Kickstart.',
      task: '<b>LPF del rumble entre 100 y 300 Hz</b>, <b>HPF entre 40 y 70 Hz</b> y <b>ducking de 18 dB o más</b>, con hold + release que terminen <b>antes del golpe siguiente</b>.',
      check: (P, S, M) => inR(P.rlpf.cut, 100, 300) && inR(P.rlpf.hpf, 40, 70) && P.duck.depth >= 18 && P.duck.hold + P.duck.release <= 0.95 * (60000 / S.bpm),
      gloss: [['Sidechain', 'Usar una señal (el kick) para controlar un proceso en otra (el rumble).'], ['Ducking', 'Bajar el volumen de algo cada vez que suena otra cosa.'], ['Volume shaping', 'Dibujar la curva de volumen por pulso en vez de usar un compresor.'], ['Release', 'Lo que tarda el rumble en volver a su volumen después del kick.'], ['Bombeo (pump)', 'La respiración rítmica que deja el sidechain.']] },

    { n: 12, mods: ['rdrive', 'delay', 'rtune'], title: 'Rumble III: distorsión, delay y nota', kicker: 'El rumble se vuelve instrumento',
      concept: 'Ahora el rumble se vuelve instrumento. <b>Distorsión</b>: como en el kick, crea armónicos para que el rumble se oiga en parlantes chicos y gane mordida. <b>Rumble de delay</b>: una copia del kick pasa por un <b>delay sincronizado</b> (1/16 o 1/8) antes de la reverb; los rebotes meten pulso rítmico dentro de la cola. <b>Afinar el rumble</b>: un realce resonante en la octava y la quinta de la nota de la tonalidad hace que la cola cante en esa nota sin pisar el sub del kick.',
      why: 'Es lo que separa un rumble genérico de uno que es parte del tema: un rumble afinado funciona como bajo, y la distorsión con delay le da el movimiento de los rumbles actuales, que muchos productores arman con varias capas en paralelo.',
      task: '<b>Distorsión del rumble de 8 dB o más</b>, <b>delay con nivel sobre 20%</b> y <b>afinación de +4 dB o más</b>.',
      check: (P) => P.rdrive.drive >= 8 && P.delay.level > 20 && P.rtune.gain >= 4,
      gloss: [['Rumble de delay', 'Rebotes sincronizados del kick que entran a la reverb y le dan ritmo a la cola.'], ['Delay sincronizado', 'Eco con tiempo en figuras musicales (1/16, 1/8) del BPM.'], ['Feedback', 'Cuánto del eco vuelve a entrar al delay: más feedback, más rebotes.'], ['Realce resonante', 'Un EQ angosto y fuerte que hace sonar una nota específica.']] },

    { n: 13, mods: ['rclean', 'glue'], title: 'Pegamento final', kicker: 'Compresión, clipper y loudness',
      concept: 'Kick y rumble se tratan como una sola cosa en el <b>bus</b>. El sub del rumble ya lo cortaste en el nivel 11; ahora lo grave del rumble va a <b>mono</b>. Un <b>compresor</b> de bus pega las capas (umbral, ratio, attack, release). Después el <b>clipper</b> recorta los picos del kick para ganar volumen percibido. El <b>loudness</b> se mide en <b>LUFS</b> (volumen promedio percibido), que no es lo mismo que el pico en <b>dBFS</b>. Al final, un <b>limitador</b> que no deja pasar de −1 dBFS en pico de muestra (el true peak, entre muestras, puede quedar algo más alto).',
      why: 'El hard techno se masteriza fuerte (entre −9 y −5 LUFS). Para llegar ahí sin aplastar el golpe, los productores clipean el kick en vez de limitarlo fuerte: con 2 a 4 dB el clipper es casi transparente en transientes cortos; con más, la distorsión ya es parte del sonido, y en hard techno se busca. Y separar el sub del kick del sub del rumble es lo que hace que el kick se sienta en el pecho en vez de embarrarse.',
      task: '<b>Mono bajo 100 Hz o más</b> en el rumble, <b>clipper de 3 dB o más</b> y loudness <b>entre −9 y −5 LUFS</b>.',
      check: (P, S, M) => P.rclean.mono >= 100 && P.glue.clip >= 3 && M && inR(M.lufs, -9, -5),
      gloss: [['Bus', 'Canal donde se suman varias señales para procesarlas juntas.'], ['Compresor', 'Baja el volumen cuando la señal pasa el umbral, según la ratio.'], ['Glue (pegamento)', 'Compresión de bus que hace sonar las capas como una sola.'], ['Clipper', 'Recorta los picos en seco: más volumen percibido con el mismo pico.'], ['LUFS', 'Unidad de loudness: volumen promedio como lo percibe el oído.'], ['dBFS', 'Decibeles respecto al máximo digital. 0 dBFS es el techo.'], ['Limitador', 'Compresor extremo que impide que la señal pase un techo.'], ['Gain staging', 'Cuidar el nivel en cada etapa de la cadena.']] },

    { n: 14, mods: ['hat', 'lead'], title: 'El súper kick', kicker: 'Inspirado en Brutalismus 3000',
      concept: 'Todo junto a 150-160 BPM: kick saturado y afinado, rumble distorsionado que respira, un <b>hat abierto en el contratiempo</b> (el "tss" entre golpes que hace galopar el groove) y, si quieres, un <b>arpegio</b> trance de fondo, porque el hard techno de hoy mezcla rave noventero, trance y actitud punk. Carga el preset <b>Berlín 155</b> y compáralo con tu kick con el A/B: escucha qué hice distinto y cópialo con tus manos.',
      why: 'Brutalismus 3000, dúo de Berlín (Victoria Vassiliki Daldas en la voz, Theo Zeitner en la producción), mezcla techno duro, trance, gabber, hardcore y actitud punk, con la voz gritada al frente y BPM altos. Ese sonido no sale de un plugin mágico: es la misma cadena que armaste, empujada al límite. Un productor profesional sabe exactamente qué perilla produce cada cosa que oye.',
      task: 'Pon el <b>BPM entre 145 y 160</b>, suma el <b>hat</b> y compara <b>tu kick con el preset</b> usando el A/B.',
      check: (P, S) => inR(S.bpm, 145, 160) && P.hat.level > 10 && S.presetHeard,
      gloss: [['Contratiempo (offbeat)', 'El espacio entre dos kicks. El hat ahí hace galopar el groove.'], ['Hat abierto', 'Platillo metálico con cola más larga que la del hat cerrado; en techno marca el contratiempo.'], ['Arpegio', 'Las notas de un acorde tocadas una tras otra, en ritmo.'], ['Preset', 'Un ajuste guardado de todas las perillas.'], ['Referencia', 'Un sonido profesional con el que comparas el tuyo para entrenar el oído.']] },

    { n: 15, mods: [], title: 'Estudio libre', kicker: 'Tu biblioteca de kicks',
      concept: 'Todos los módulos a la vista. Guarda tus kicks como presets, cárgalos, compáralos y exporta WAV para llevarlos a tu DAW: el <b>kick solo</b> (one-shot), el <b>rumble solo</b> (un compás en loop) o el <b>loop completo</b>. Los LED de cada módulo lo apagan o prenden: apagar y prender módulos es la mejor forma de escuchar qué hace cada uno.',
      why: 'Un productor profesional tiene su biblioteca de kicks propios, afinados y nombrados por tonalidad y BPM. El oído se entrena repitiendo: diseña un kick desde cero en cinco minutos, guárdalo y al día siguiente intenta clonarlo sin mirar con el <b>reto de oído</b>.',
      task: '<b>Exporta tu kick en WAV</b> y guárdalo como preset.',
      check: (P, S) => S.exported && S.savedPreset,
      gloss: [['WAV', 'Formato de audio sin compresión; el estándar para llevar sonidos a un DAW.'], ['DAW', 'Estación de trabajo de audio digital: Ableton, FL Studio, Bitwig…']] },
  ];

  // preset de referencia: hard techno a 155 BPM, kick en F (inspirado en Brutalismus 3000)
  KL.PRESET_BRUTAL = {
    bpm: 155,
    P: {
      osc: { freq: 43.65 }, amp: { attack: 0.3, hold: 28, decay: 240, curve: 2.2 },
      pitch: { start: 260, time: 42, curve: 3.6 }, wave: { type: 'sine' },
      click: { noise: 28, nfreq: 5200, ndecay: 11, tone: 22, tfreq: 2600, tdecay: 3.5 },
      filter: { type: 'lp', cutoff: 5200, q: 1.1, env: 2.6, edecay: 55 },
      drive: { mode: 'hard', drive: 22, mix: 92, bits: 8, rate: 4 },
      eq: { hpf: 28, mudF: 320, mud: -6, presF: 3600, pres: 3.5 },
      tune: { key: 5, cents: 0, len: 82 },
      verb: { send: 70, decay: 3.8, pre: 8, damp: 2600, ret: 105 },
      rlpf: { cut: 170, hpf: 52 }, duck: { depth: 32, hold: 22, release: 190, shape: 1.8 },
      rdrive: { drive: 18 }, delay: { div: '1/16', fb: 38, level: 40 }, rtune: { gain: 8, q: 7 },
      rclean: { mono: 150 },
      glue: { thr: -10, ratio: 3, att: 15, rel: 110, clip: 8, cmode: 'hard' },
      hat: { level: 55, decay: 110 }, lead: { level: 28, cut: 2800 },
    },
  };

  KL.defaultParams = function () {
    const P = {};
    for (const [m, def] of Object.entries(KL.MODULES)) {
      P[m] = {};
      for (const [k, p] of Object.entries(def.params)) P[m][k] = p.def;
    }
    return P;
  };
})();
