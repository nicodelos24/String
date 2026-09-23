// Teclado expandible: piano de varias octavas que acompaña al mástil y se toca
// con el teclado físico o con el puntero. Tres modos elegidos en el panel
// izquierdo: «Mástil» (solo el mástil, las teclas lo tocan con el sonido del
// instrumento), «Teclado» (el piano reemplaza el mástil) y «Ambos» (el piano
// junto al mástil; las teclas tocan solo el piano y el mástil muestra las notas
// del micrófono). Teclas naturales de la fila media: a s d f g h j k l ñ ;
// = A B C D E F G A B C (a suena una octava más alta que el la de la 5.ª
// cuerda: A3, 220 Hz, octava por defecto del piano).
// Fila grave: z x c v b n m , . - = E F G A B C D E F G (z usa el mi de la
// 6.ª cuerda). Accidentales en la fila superior: q w e r t y u i o p, uno por
// columna sobre cada natural (q=ab/g#, w=a#/bb, …) y las que no tienen tecla
// negra debajo tocan la misma nota natural de su columna (e, y, p); t queda
// d#/eb y las posiciones sin letra fija (´, +, }) completan c#/db, d#/eb y e
// para el teclado latam. Shift izquierdo baja una octava y derecho la sube.
// Sintetizador polifónico con timbres, efectos y control de volumen
// (compartido por el piano y el mástil). La lógica pura y el sintetizador se
// exportan para pruebas sin navegador.

var WHITE_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
var BLACK_SPECS = [[1, 1], [3, 2], [6, 4], [8, 5], [10, 6]];
var KEY_OFFSETS = { a: 0, s: 2, d: 3, f: 5, g: 7, h: 8, j: 10, k: 12, l: 14, ñ: 15, ';': 15, q: -1, w: 1, e: 3, r: 4, t: 6, y: 8, u: 9, i: 11, o: 13, p: 15, z: -5, x: -4, c: -2, v: 0, b: 2, n: 3, m: 5, ',': 7, '.': 8, '-': 10 };
// Posiciones físicas que cambian de carácter según el idioma del teclado y
// palabras muertas (acentos), identificadas por código en vez de por letra.
// Teclado latam: ´ (BracketLeft) = c#/db, + (Equal) = d#/eb y } (BracketRight)
// = e por encima de la fila media; la comilla (Quote) conserva la natural D4.
var KEY_CODES = { Semicolon: 15, Quote: 17, BracketLeft: 16, Equal: 18, BracketRight: 19 };
var KEYBOARD_NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Offset para una tecla según su letra o, si esa posición no tiene letra fija
// (ñ, ´, etc. cambian según el idioma), según la posición física de la tecla.
function keyOffsetFor(event) {
  var byKey = KEY_OFFSETS[event.key.toLowerCase()];
  if (byKey !== undefined) return byKey;
  return KEY_CODES[event.code];
}

// ¿El foco está en un campo donde las teclas deben escribir y no tocar notas?
// Los switchs, radios y el slider de volumen NO bloquean las teclas musicales:
// el clic los deja enfocados pero igual se puede tocar después.
function keyTargetIsTyping(target) {
  if (!target || typeof target.tagName !== 'string') return false;
  var tagname = target.tagName.toUpperCase();
  if (tagname === 'TEXTAREA' || target.isContentEditable) return true;
  if (tagname === 'SELECT') return true;
  if (tagname === 'INPUT') {
    var type = String(target.type || 'text').toLowerCase();
    return type === 'text' || type === 'search' || type === 'url' || type === 'email'
      || type === 'tel' || type === 'number' || type === 'password' || type === 'date' || type === 'file';
  }
  return false;
}

function keyboardMidiFor(octave, semitone) { return 12 * (octave + 1) + semitone; }

// Genera las teclas visibles. Las blancas llevan índice 0-based dentro del
// pentagrama total; las negras llevan la columna (1-based) entre blancas,
// igual que #root-piano, para posicionarse con translateX(-50%).
function keyStrip(octaveStart, count, baseMidi) {
  var totalWhite = count * 7, whites = [], blacks = [];
  for (var o = 0; o < count; o++) {
    var octave = octaveStart + o;
    WHITE_SEMITONES.forEach(function (semi, wi) {
      var midi = keyboardMidiFor(octave, semi);
      whites.push({ midi: midi, position: o * 7 + wi, octave: octave, pitchClass: semi, mapped: keyLetter(midi, baseMidi) });
    });
    BLACK_SPECS.forEach(function (spec) {
      var midi = keyboardMidiFor(octave, spec[0]);
      blacks.push({ midi: midi, position: o * 7 + spec[1], octave: octave, pitchClass: spec[0], mapped: keyLetter(midi, baseMidi) });
    });
  }
  return { whites: whites, blacks: blacks, totalWhite: totalWhite };
}

// Letra del teclado físico que dispara un MIDI dentro de la ventana activa.
function keyLetter(midi, baseMidi) {
  var offset = midi - baseMidi;
  var letters = Object.keys(KEY_OFFSETS);
  for (var i = 0; i < letters.length; i++) if (KEY_OFFSETS[letters[i]] === offset) return letters[i];
  return '';
}

// Valor base (MIDI de la tecla 'a') respetando los límites de las octavas visibles.
function activeBaseMidi(base, shiftDir, octaveStart, count) {
  var next = base + shiftDir * 12;
  var min = keyboardMidiFor(octaveStart, 0);
  var max = keyboardMidiFor(octaveStart + Math.max(0, count - 2), 0);
  return Math.max(min, Math.min(max, next));
}

// Marca o desmarca en el mástil (y cuerdas al aire) las posiciones cuyo MIDI
// coincide con el indicado, usando la clase del teclado para distinguirlas del
// resaltado del micrófono. Devuelve cuántos elementos cambiaron.
function mastilKeyToggle(notes, midi, on) {
  var changed = 0;
  for (var i = 0; i < notes.length; i++) {
    var note = notes[i];
    if (note && Number(note.dataset.midi) === midi) {
      var wasOn = note.classList.contains('keyboard-live');
      if (on) note.classList.add('keyboard-live'); else note.classList.remove('keyboard-live');
      if (wasOn !== on) changed++;
    }
  }
  return changed;
}

// Estado visual de un modo del teclado para la lógica pura: si el panel queda
// oculto o visible y qué clase recibe la sección del mástil.
function keyboardLayoutClasses(mode) {
  if (mode === 'mastil') return { hidden: true, open: false, split: false };
  if (mode === 'ambos') return { hidden: false, open: false, split: true };
  return { hidden: false, open: true, split: false };
}

// Reconocimiento del acorde formado por las notas pulsadas con el teclado.
// Devuelve {root, type, mode}: con 2 notas bastan raíz (la más grave) y su
// tercera (intervalo de 3 = menor, 4 = mayor). Con 3 o más notas se usan las
// plantillas (iguales a las del micrófono); null sin coincidencia.
// Prefiere la plantilla que explica más notas con menos extras y, entre
// empates, la de más notas y la raíz más cercana a la nota más grave.
function chordFromNotes(midis, templates) {
  if (!Array.isArray(midis) || midis.length < 2) return null;
  var present = [];
  for (var i = 0; i < midis.length; i++) {
    if (!Number.isInteger(midis[i])) continue;
    var pitch = ((midis[i] % 12) + 12) % 12;
    if (present.indexOf(pitch) === -1) present.push(pitch);
  }
  if (present.length < 2) return null;
  present.sort(function (a, b) { return a - b; });
  if (present.length === 2) {
    var lo = Math.min.apply(null, midis);
    var hi = Math.max.apply(null, midis);
    var third = (hi - lo) % 12;
    if (third !== 3 && third !== 4) return null;
    return { root: lo % 12, type: third === 3 ? 'm' : 'maj', mode: third === 3 ? 'aeolian' : 'ionian' };
  }
  var table = templates || (typeof LIVE_CHORD_TEMPLATES !== 'undefined' ? LIVE_CHORD_TEMPLATES : []);
  if (!table.length) return null;
  var lowest = Math.min.apply(null, present);
  var bestScore, best = null;
  for (var root = 0; root < 12; root++) {
    for (var t = 0; t < table.length; t++) {
      var required = table[t].intervals.map(function (interval) { return (root + interval) % 12; });
      var missing = required.some(function (pitch) { return present.indexOf(pitch) === -1; });
      if (missing) continue;
      var extras = present.filter(function (pitch) { return required.indexOf(pitch) === -1; }).length;
      var bassDist = (root - lowest + 12) % 12;
      var score = [required.length - extras, -extras, required.length, -bassDist];
      if (!best || scoreAhead(score, bestScore)) {
        bestScore = score;
        best = { root: root, type: table[t].type, mode: table[t].mode };
      }
    }
  }
  return best;
}

function scoreAhead(a, b) {
  for (var i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}

// Fase «Nota»: con dos o más notas se detecta el acorde real (mayor, menor y
// más) igual que en la fase «Acorde»; con una sola nota no alcanza y la
// detección se delega a la calidad elegida a la izquierda.
function liveNoteChord(notes, templates) {
  if (!Array.isArray(notes) || notes.length < 2) return null;
  return chordFromNotes(notes, templates) || null;
}

function keyboardImpulse(context, seconds, decay) {
  var length = Math.floor((context.sampleRate || 44100) * seconds);
  var buffer = context.createBuffer(2, length, context.sampleRate || 44100);
  for (var channel = 0; channel < 2; channel++) {
    var data = buffer.getChannelData(channel);
    for (var i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
  }
  return buffer;
}

// Cuerda pulsada (Karplus-Strong): un pulso de ruido recorre un codo que
// promedia consigo mismo y se apaga solo. brightness acerca el timbre a la
// guitarra (agudos presentes) o al bajo (menos brillante).
function pluckWave(sampleRate, frequency, seconds, options) {
  options = options || {};
  var damping = options.damping || 0.996;
  var brightness = options.brightness === undefined ? 0.9 : options.brightness;
  var length = Math.ceil(sampleRate * seconds);
  var period = Math.max(2, Math.round(sampleRate / frequency));
  var out = new Float32Array(length);
  for (var i = 0; i < period && i < length; i++) {
    out[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / period, 0.5);
  }
  for (var i = period; i < length; i++) {
    out[i] = 0.5 * (out[i - period] + out[i - period + 1]) * damping;
  }
  if (brightness < 1) {
    var a = 1 - brightness, last = 0;
    for (var i = 0; i < length; i++) {
      last = last + a * (out[i] - last);
      out[i] = last;
    }
  }
  var peak = 0;
  for (var i = 0; i < length; i++) {
    var v = out[i] < 0 ? -out[i] : out[i];
    if (v > peak) peak = v;
  }
  if (peak > 0) {
    var scale = 0.85 / peak;
    for (var i = 0; i < length; i++) out[i] *= scale;
  }
  return out;
}

function KeySynth(options) {
  options = options || {};
  this.createContext = options.createContext || (function () { return new (window.AudioContext || window.webkitAudioContext)(); });
  this.timbre = options.timbre || 'piano';
  this.delay = Boolean(options.delay);
  this.reverb = Boolean(options.reverb);
  this.volume = typeof options.volume === 'number' ? options.volume : 0.3;
  this.voices = new Map();
  this.voiceSequence = 0;
  this.pluckCache = new Map();
  this.context = null;
}
KeySynth.prototype.ensure = function () {
  var self = this;
  if (this.context) return Promise.resolve();
  var ctx;
  try { ctx = this.createContext(); } catch (error) { return Promise.reject(error); }
  try { ctx.resume && ctx.resume(); } catch (error) { /* la reproducción parte del gesto del usuario */ }
  this.context = ctx;
  var master = ctx.createGain();
  master.gain.value = this.volume;
  master.connect(ctx.destination);
  var bus = ctx.createGain();
  bus.gain.value = 1;
  bus.connect(master);
  this.master = master;
  this.bus = bus;
  if (ctx.createDelay) {
    var delay = ctx.createDelay(2);
    delay.delayTime.value = 0.33;
    var feedback = ctx.createGain();
    feedback.gain.value = 0.32;
    var delaySend = ctx.createGain();
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(master);
    delaySend.connect(delay);
    delaySend.gain.value = this.delay ? 0.3 : 0;
    this.delaySend = delaySend;
  }
  if (ctx.createConvolver && ctx.createBuffer) {
    var convolver = ctx.createConvolver();
    var reverbSend = ctx.createGain();
    try { convolver.buffer = keyboardImpulse(ctx, 1.8, 3); } catch (error) { return; }
    reverbSend.connect(convolver);
    convolver.connect(master);
    reverbSend.gain.value = this.reverb ? 0.32 : 0;
    this.reverbSend = reverbSend;
  }
  return Promise.resolve();
};
KeySynth.prototype.oscSpecsFor = function (midi) {
  var fundamental = 440 * Math.pow(2, (midi - 69) / 12);
  if (this.timbre === 'organ') return [
    { frequency: fundamental, type: 'sine', weight: 1 },
    { frequency: fundamental * 2, type: 'sine', weight: 0.55 },
    { frequency: fundamental * 3, type: 'sine', weight: 0.28 }
  ];
  if (this.timbre === 'lead') return [
    { frequency: fundamental, type: 'sawtooth', weight: 0.8 },
    { frequency: fundamental * 1.007, type: 'sawtooth', weight: 0.8 }
  ];
  return [
    { frequency: fundamental, type: 'triangle', weight: 1 },
    { frequency: fundamental * 2, type: 'sine', weight: 0.5 },
    { frequency: fundamental * 3, type: 'sine', weight: 0.25 }
  ];
};
KeySynth.prototype.sustainTarget = function () {
  if (this.timbre === 'organ') return 1;
  if (this.timbre === 'lead') return 0.95;
  return 0.6;
};
KeySynth.prototype.releaseTime = function () {
  if (this.timbre === 'organ') return 0.05;
  if (this.timbre === 'lead') return 0.09;
  return 0.14;
};
KeySynth.prototype.noteOn = function (midi, timbre) {
  var self = this;
  if (!Number.isInteger(midi) || midi < 0 || midi > 127) return Promise.resolve(false);
  var effective = timbre || this.timbre;
  return this.ensure().then(function () {
    if (!self.context || self.voices.has(midi)) return false;
    var ctx = self.context, t = ctx.currentTime || 0;
    if (effective === 'guitar' || effective === 'bass') return self.pluckOn(ctx, midi, effective, t);
    var voiceGain = ctx.createGain();
    voiceGain.gain.setValueAtTime(0, t);
    voiceGain.gain.linearRampToValueAtTime(0.24, t + 0.014);
    voiceGain.gain.setTargetAtTime(0.24 * self.sustainTarget(), t + 0.02, 0.12);
    voiceGain.connect(self.bus);
    var specs = self.oscSpecsFor(midi), total = 0, nodes = [];
    specs.forEach(function (spec) { total += spec.weight; });
    specs.forEach(function (spec) {
      var osc = ctx.createOscillator();
      osc.type = spec.type;
      osc.frequency.setValueAtTime(spec.frequency, t);
      var partial = ctx.createGain();
      partial.gain.value = spec.weight / total;
      osc.connect(partial);
      partial.connect(voiceGain);
      osc.start(t);
      nodes.push({ osc: osc, partial: partial });
    });
    self.voices.set(midi, { gain: voiceGain, nodes: nodes, id: ++self.voiceSequence });
    return true;
  });
};

// Sonido de cuerda pulsada: reproduce la onda de Karplus-Strong (una sola vez,
// se extingue sola) para guitarra o bajo según el timbre indicado.
KeySynth.prototype.pluckBuffer = function (ctx, midi, timbre) {
  if (!ctx.createBuffer) return null;
  var rate = ctx.sampleRate || 44100;
  var frequency = 440 * Math.pow(2, (midi - 69) / 12);
  var key = rate + ':' + midi + ':' + timbre;
  if (this.pluckCache && this.pluckCache.has(key)) return this.pluckCache.get(key);
  var options = timbre === 'bass' ? { damping: 0.9945, brightness: 0.35 } : { damping: 0.9965, brightness: 0.92 };
  var wave = pluckWave(rate, frequency, 2.2, options);
  var buffer;
  try {
    buffer = ctx.createBuffer(1, wave.length, rate);
    buffer.getChannelData(0).set(wave);
  } catch (error) { return null; }
  this.pluckCache.set(key, buffer);
  return buffer;
};

KeySynth.prototype.pluckOn = function (ctx, midi, timbre, t) {
  var self = this;
  var buffer = this.pluckBuffer(ctx, midi, timbre);
  if (!buffer) return false;
  var source = ctx.createBufferSource();
  source.buffer = buffer;
  var gain = ctx.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.5, t + 0.004);
  gain.connect(this.bus);
  source.connect(gain);
  source.start(t);
  this.voices.set(midi, {
    gain: gain,
    source: source,
    nodes: [{ source: source }],
    pluck: true,
    id: ++this.voiceSequence
  });
  return true;
};
KeySynth.prototype.noteOff = function (midi) {
  var voice = this.voices.get(midi);
  if (!voice || !this.context) return;
  this.voices.delete(midi);
  var ctx = this.context, t = ctx.currentTime || 0;
  var release = voice.pluck ? 0.05 : this.releaseTime();
  voice.gain.gain.cancelScheduledValues(t);
  voice.gain.gain.setTargetAtTime(0, t, release);
  voice.nodes.forEach(function (node) {
    if (node.osc) node.osc.stop(t + release * 6 + 0.05);
    else if (node.source) node.source.stop(t + release * 6 + 0.05);
  });
};
KeySynth.prototype.allOff = function () {
  var self = this;
  Array.from(this.voices.keys()).forEach(function (midi) { self.noteOff(midi); });
};
KeySynth.prototype.setTimbre = function (timbre) { this.timbre = timbre; };
KeySynth.prototype.setDelay = function (enabled) {
  this.delay = Boolean(enabled);
  if (this.delaySend) this.delaySend.gain.value = this.delay ? 0.3 : 0;
};
KeySynth.prototype.setReverb = function (enabled) {
  this.reverb = Boolean(enabled);
  if (this.reverbSend) this.reverbSend.gain.value = this.reverb ? 0.32 : 0;
};
KeySynth.prototype.setVolume = function (volume) {
  this.volume = volume;
  if (this.master) this.master.gain.value = volume;
};
KeySynth.prototype.close = function () {
  this.allOff();
  if (this.context && this.context.close) {
    try { this.context.close(); } catch (error) { /* el contexto ya no existe */ }
  }
  this.context = null;
  this.master = null;
  this.bus = null;
  this.delaySend = null;
  this.reverbSend = null;
  this.pluckCache = new Map();
};

if (typeof module !== 'undefined' && module.exports) module.exports = {
  WHITE_SEMITONES: WHITE_SEMITONES,
  BLACK_SPECS: BLACK_SPECS,
  KEY_OFFSETS: KEY_OFFSETS,
  KEY_CODES: KEY_CODES,
  keyboardMidiFor: keyboardMidiFor,
  keyStrip: keyStrip,
  keyLetter: keyLetter,
  activeBaseMidi: activeBaseMidi,
  keyOffsetFor: keyOffsetFor,
  keyTargetIsTyping: keyTargetIsTyping,
  mastilKeyToggle: mastilKeyToggle,
  keyboardLayoutClasses: keyboardLayoutClasses,
  chordFromNotes: chordFromNotes,
  liveNoteChord: liveNoteChord,
  pluckWave: pluckWave,
  KeySynth: KeySynth,
  noteNames: KEYBOARD_NOTE_NAMES
};

if (typeof document !== 'undefined') (function () {
  var panel = document.getElementById('keyboard-section');
  var modesRoot = document.getElementById('keyboard-modes');
  if (!panel) return;
  var keysEl = document.getElementById('keyboard-keys');
  var rangeEl = document.getElementById('keyboard-range');
  var octaveEl = document.getElementById('keyboard-octave');
  var timbreSel = document.getElementById('keyboard-timbre');
  var delayIn = document.getElementById('keyboard-delay');
  var reverbIn = document.getElementById('keyboard-reverb');
  var volumeIn = document.getElementById('keyboard-volume');
  var mastilVolumeIn = document.getElementById('mastil-volume');
  var closeBtn = document.getElementById('keyboard-close');
  var spellingIn = document.getElementById('keyboard-spelling');
  var rootSpelling = document.getElementById('root-spelling');

  var OCTAVE_START = 3, OCTAVE_COUNT = 4;
  // El piano suena por defecto una octava más alta que la guitarra: la clave
  // «a» usa el la una octava por encima del de la 5.ª cuerda (A3, 220 Hz).
  var baseMidi = keyboardMidiFor(3, 9);
  var shiftLeft = false, shiftRight = false;
  var synth = new KeySynth({ timbre: timbreSel ? timbreSel.value : 'piano', volume: volumeIn ? Number(volumeIn.value) / 100 : 0.3 });
  var pressed = new Map();
  var pointerNotes = [];

  function shiftDirection() { return shiftRight ? 1 : shiftLeft ? -1 : 0; }
  function effectiveBase() { return activeBaseMidi(baseMidi, shiftDirection(), OCTAVE_START, OCTAVE_COUNT); }

  function modeButtonFor(modeName) {
    return modesRoot ? modesRoot.querySelector('[data-keyboard-mode="' + modeName + '"]') : null;
  }

  function keyboardModeButtons() {
    return modesRoot ? [].slice.call(modesRoot.querySelectorAll('[data-keyboard-mode]')) : [];
  }

  function setMode(mode) {
    var layout = keyboardLayoutClasses(mode);
    panel.hidden = layout.hidden;
    var section = document.querySelector('.fretboard-section');
    if (section) {
      section.classList.toggle('keyboard-open', layout.open);
      section.classList.toggle('keyboard-split', layout.split);
    }
    var addRow = document.getElementById('keyboard-add-row');
    if (addRow) addRow.hidden = !layout.split;
    keyboardModeButtons().forEach(function (button) {
      var active = button.dataset.keyboardMode === mode;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('is-active', active);
    });
    if (!layout.hidden) { render(); clearMastil(); }
    else { synth.allOff(); clearMastil(); }
    if (typeof recomputeKeyboardLive === 'function') recomputeKeyboardLive();
  }

  // Modo mástil: con el panel oculto (modo «Mástil»), las mismas teclas marcan
  // la nota pulsada en el mástil de guitarra/bajo en vez de un piano, y suenan
  // con el timbre del instrumento activo. En «Ambos» el panel está visible, así
  // que las teclas tocan el piano y no el mástil.
  function inMastilMode() { return panel.hidden; }

  function mastilTimbre() {
    return typeof instrument !== 'undefined' && instrument === 'bass' ? 'bass' : 'guitar';
  }

  // Octava base del modo mástil: el bajo necesita notas más graves que la
  // guitarra para tener posiciones en el diapasón.
  function mastilBaseMidi() {
    var isBass = mastilTimbre() === 'bass';
    var octaveStart = isBass ? 2 : 3;
    var base = keyboardMidiFor(octaveStart + (isBass ? 0 : 1), 0);
    return activeBaseMidi(base, shiftDirection(), octaveStart, 4);
  }

  function mastilNotes() {
    return document.querySelectorAll('#fretboard [data-midi], #open-strings [data-midi]');
  }

  function applyMastil(midi, on) {
    mastilKeyToggle(mastilNotes(), midi, on);
  }

  function clearMastil() {
    document.querySelectorAll('#fretboard .keyboard-live, #open-strings .keyboard-live').forEach(function (element) {
      element.classList.remove('keyboard-live');
    });
  }

  // Al reconstruirse el mástil (acorde, modo, instrumento) se reaplica el
  // resaltado de las notas que siguen sonando en modo mástil.
  var mastilObserver = new MutationObserver(function () {
    if (!inMastilMode()) return;
    pressed.forEach(function (midi) { applyMastil(midi, true); });
  });
  ['fretboard', 'open-strings'].forEach(function (id) {
    var node = document.getElementById(id);
    if (node) mastilObserver.observe(node, { childList: true, subtree: true });
  });

  function render() {
    var base = effectiveBase();
    var strip = keyStrip(OCTAVE_START, OCTAVE_COUNT, base);
    keysEl.style.setProperty('--key-total', String(strip.totalWhite));
    keysEl.innerHTML = strip.whites.map(keyButton).join('')
      + strip.blacks.map(keyButton).join('');
    if (rangeEl) rangeEl.textContent = 'C' + OCTAVE_START + '–B' + (OCTAVE_START + OCTAVE_COUNT - 1);
    if (octaveEl) octaveEl.textContent = keyboardNoteLabel(base);
    pressed.forEach(function (midi) { setPlaying(midi, true); });
    pointerNotes.forEach(function (midi) { setPlaying(midi, true); });
  }

  function keyboardNoteLabel(midi) {
    return KEYBOARD_NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
  }

  // Nombres de las teclas negras según la elección de bemoles (♭) o
  // sostenidos (♯), sincronizada con el interruptor raíz de la app.
  function keyboardKeyLabel(pitchClass) {
    if (typeof pianoUseFlats !== 'undefined' && pianoUseFlats) {
      var flat = { 1: 'Db', 3: 'Eb', 6: 'Gb', 8: 'Ab', 10: 'Bb' }[pitchClass];
      if (flat) return flat;
    }
    return KEYBOARD_NOTE_NAMES[pitchClass];
  }

  function keyButton(key) {
    var white = key.pitchClass === 0 || key.pitchClass === 2 || key.pitchClass === 4 || key.pitchClass === 5 || key.pitchClass === 7 || key.pitchClass === 9 || key.pitchClass === 11;
    var label = keyboardKeyLabel(key.pitchClass);
    var hint = key.mapped ? '<small>' + key.mapped + '</small>' : '';
    return '<button type="button" class="kp-key kp-' + (white ? 'white' : 'black')
      + (key.mapped ? ' has-key' : '') + '" data-midi="' + key.midi + '"'
      + (white ? '' : ' style="--key-position:' + key.position + '"')
      + ' title="' + label + (key.mapped ? ' · tecla ' + key.mapped : '') + '"><span>' + label + '</span>' + hint + '</button>';
  }

  function onPointerDown(event) {
    var key = event.target.closest('[data-midi]');
    if (!key) return;
    event.preventDefault();
    var midi = Number(key.dataset.midi);
    if (pointerNotes.indexOf(midi) === -1) pointerNotes.push(midi);
    synth.noteOn(midi).then(function () { setPlaying(midi, true); });
  }
  function onPointerEnd() {
    pointerNotes.forEach(function (midi) {
      synth.noteOff(midi);
      setPlaying(midi, false);
    });
    pointerNotes = [];
  }
  function setPlaying(midi, on) {
    Array.prototype.forEach.call(keysEl.querySelectorAll('[data-midi="' + midi + '"]'), function (element) {
      element.classList.toggle('playing', on);
    });
  }

  // Acorde en vivo: las tres fases del control del pie del mástil. Apagado:
  // tocar no cambia la escala. Nota: con dos o más notas detecta el acorde
  // real (mayor, menor y más); una sola nota usa la calidad y el modo elegidos
  // a la izquierda. Acorde: con la raíz (nota más grave) y su tercera alcanza;
  // toca más notas para acordes más ricos. Enter agrega a las tarjetas.
  var liveRoot = document.getElementById('keyboard-live-chord');
  var keyboardLive = null;      // último acorde detectado
  var keyboardLiveKey = '';     // raíz:tipo:modo ya aplicado en el mástil
  var mastilClickMidis = new Set();  // notas marcadas con clicks en el mástil (en modo acorde)

  function liveButtons() {
    return liveRoot ? [].slice.call(liveRoot.querySelectorAll('[data-live-mode]')) : [];
  }

  function keyboardLivePhase() {
    var buttons = liveButtons();
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].getAttribute('aria-pressed') === 'true') return buttons[i].dataset.liveMode || 'off';
    }
    return 'off';
  }

  // El mástil está visible en «Mástil» (panel oculto) y en «Ambos» (layout
  // dividido por abajo del piano); en «Teclado» queda oculto.
  function mastilShown() {
    if (panel.hidden) return true;
    var section = document.querySelector('.fretboard-section');
    return !!section && section.classList.contains('keyboard-split');
  }

  window.__liveChordActive = function () {
    const keyboard = keyboardLivePhase() !== 'off' && mastilShown();
    const microphone = typeof window.__microLiveActive === 'function' && window.__microLiveActive();
    return keyboard || microphone;
  };

  function keyboardLiveEnabled() {
    return !!liveRoot && keyboardLivePhase() !== 'off' && mastilShown();
  }

  function setKeyboardPlaying(on) {
    if (liveRoot) liveRoot.dataset.playing = on ? '1' : '';
  }

  // Notas activas: las teclas mantenidas más las marcadas en el mástil.
  function activeNotes() {
    var notes = [];
    pressed.forEach(function (midi) { if (notes.indexOf(midi) === -1) notes.push(midi); });
    mastilClickMidis.forEach(function (midi) {
      if (Number.isFinite(midi) && notes.indexOf(midi) === -1) notes.push(Math.round(midi));
    });
    notes.sort(function (a, b) { return a - b; });
    return notes;
  }

  // Acorde de una sola nota según la calidad y el modo de los controles izquierdos.
  function chordFromQuality(pitch) {
    var type = typeof chordType !== 'undefined' && chordType ? chordType.value : 'maj';
    var modeName = typeof selectedMode !== 'undefined' && selectedMode ? selectedMode : (type === 'm' ? 'aeolian' : type === 'dim' ? 'locrian' : 'ionian');
    var spelling = typeof notes !== 'undefined' && notes[pitch];
    if (typeof pianoUseFlats !== 'undefined' && pianoUseFlats && typeof noteLabels !== 'undefined') {
      spelling = noteLabels[spelling] || spelling;
    }
    return { root: pitch, rootNoteName: spelling, type: type, mode: modeName };
  }

  function recomputeKeyboardLive() {
    if (!keyboardLiveEnabled()) { resetKeyboardLive(); return; }
    var phase = keyboardLivePhase();
    var notes = activeNotes();
    var chord = null;
    if (phase === 'note' && notes.length >= 1) {
      chord = liveNoteChord(notes) || chordFromQuality(notes[0] % 12);
    } else if (phase === 'chord' && notes.length >= 2) {
      chord = chordFromNotes(notes);
    }
    if (!chord) { resetKeyboardLive(); return; }
    keyboardLive = chord;
    setKeyboardPlaying(true);
    if (typeof showProgressionChord === 'function') {
      var key = chord.root + ':' + chord.type + ':' + chord.mode;
      if (key !== keyboardLiveKey) {
        keyboardLiveKey = key;
        showProgressionChord({ root: chord.root, rootNoteName: chord.rootNoteName || noteName(chord.root), type: chord.type, mode: chord.mode }, -1);
      }
    }
  }

  function resetKeyboardLive() {
    keyboardLive = null;
    keyboardLiveKey = '';
    setKeyboardPlaying(false);
  }

  function clearLivePhase() {
    mastilClickMidis.clear();
    resetKeyboardLive();
  }

  function addKeyboardLiveChord() {
    if (!keyboardLive || !progression || draggingProgressionItem || progression.length >= 4096) return;
    var item = { root: keyboardLive.root, rootNoteName: noteName(keyboardLive.root), type: keyboardLive.type, mode: keyboardLive.mode, ghostMode: '', beats: 4 };
    progression.push(item);
    progressionEdited = true;
    if (typeof saveCustomProgression === 'function') saveCustomProgression();
    if (globalThis.StringSections && globalThis.StringSections.include) globalThis.StringSections.include(null, item);
    if (typeof renderProgression === 'function') renderProgression();
  }

  function onLiveButtonClick(button) {
    var next = button.dataset.liveMode || 'off';
    liveButtons().forEach(function (other) {
      var active = other === button;
      other.setAttribute('aria-pressed', String(active));
      other.classList.toggle('is-active', active);
    });
    if (next === 'off') clearLivePhase();
    else recomputeKeyboardLive();
  }

  // Un golpe en el mástil también alimenta la detección. En modo «Nota», la
  // última nota tocada es la raíz; en modo «Acorde», cada golpe añade o quita
  // una nota (con la raíz y la tercera alcanza).
  function onMastilNoteClick(note) {
    if (!inMastilMode()) return;
    var phase = keyboardLivePhase();
    if (phase === 'off') return;
    var midi = Math.round(Number(note.dataset.midi));
    if (!Number.isFinite(midi)) return;
    if (phase === 'note') {
      mastilClickMidis.clear();
      mastilClickMidis.add(midi);
    } else if (mastilClickMidis.has(midi)) {
      mastilClickMidis.delete(midi);
    } else {
      mastilClickMidis.add(midi);
    }
    recomputeKeyboardLive();
  }

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;
    var note = target.closest('.fret-note, .open-string-note');
    if (note) onMastilNoteClick(note);
  });

  liveButtons().forEach(function (button) {
    button.addEventListener('click', function () { onLiveButtonClick(button); });
  });

  window.addEventListener('keydown', function (event) {
    if (event.code === 'ShiftLeft') { shiftLeft = true; if (!panel.hidden) render(); return; }
    if (event.code === 'ShiftRight') { shiftRight = true; if (!panel.hidden) render(); return; }
    var target = event.target;
    // Los campos de escritura (y los select) no interceptan las teclas para
    // que se pueda tipear; los switchs y el slider de volumen se dejan pasar.
    if (keyTargetIsTyping(target)) return;
    if (target && target.tagName === 'INPUT'
      && (event.key === ' ' || event.code === 'Enter' || /^Arrow/.test(event.key))) return;
    if (event.altKey || event.metaKey || event.ctrlKey) return;
    if (event.code === 'Enter' && keyboardLiveEnabled()) {
      if (keyboardLive) addKeyboardLiveChord();
      event.preventDefault();
      return;
    }
    var offset = keyOffsetFor(event);
    if (offset === undefined) return;
    var base = inMastilMode() ? mastilBaseMidi() : effectiveBase();
    var midi = base + offset;
    if (midi < 0 || midi > 127) return;
    if (!pressed.has(event.key)) {
      pressed.set(event.key, midi);
      if (inMastilMode()) { applyMastil(midi, true); synth.noteOn(midi, mastilTimbre()); }
      else synth.noteOn(midi).then(function () { setPlaying(midi, true); });
      recomputeKeyboardLive();
    }
    event.preventDefault();
  });
  window.addEventListener('keyup', function (event) {
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
      if (event.code === 'ShiftLeft') shiftLeft = false; else shiftRight = false;
      if (!panel.hidden) render();
      return;
    }
    if (!pressed.has(event.key)) return;
    var midi = pressed.get(event.key);
    pressed.delete(event.key);
    synth.noteOff(midi);
    if (inMastilMode()) applyMastil(midi, false);
    else setPlaying(midi, false);
    recomputeKeyboardLive();
  });

  keysEl.addEventListener('pointerdown', onPointerDown);
  keysEl.addEventListener('pointerup', onPointerEnd);
  keysEl.addEventListener('pointercancel', onPointerEnd);
  keysEl.addEventListener('pointerleave', onPointerEnd);

  if (timbreSel) timbreSel.addEventListener('change', function () { synth.setTimbre(timbreSel.value); });
  if (delayIn) delayIn.addEventListener('change', function () { synth.setDelay(delayIn.checked); });
  if (reverbIn) reverbIn.addEventListener('change', function () { synth.setReverb(reverbIn.checked); });
  var volumeInputs = []; if (volumeIn) volumeInputs.push(volumeIn); if (mastilVolumeIn) volumeInputs.push(mastilVolumeIn);
  volumeInputs.forEach(function (input) {
    input.addEventListener('input', function () {
      synth.setVolume(Number(input.value) / 100);
      volumeInputs.forEach(function (other) { if (other !== input) other.value = input.value; });
    });
  });
  if (closeBtn) closeBtn.addEventListener('click', function () {
    setMode('mastil');
    var mastilBtn = modeButtonFor('mastil');
    if (mastilBtn) mastilBtn.focus();
  });
  keyboardModeButtons().forEach(function (button) {
    button.addEventListener('click', function () { setMode(button.dataset.keyboardMode || 'mastil'); });
  });
  // Switch de bemoles/sostenidos del piano: espejo del de la raíz del mástil.
  if (spellingIn && rootSpelling) {
    spellingIn.addEventListener('change', function () {
      rootSpelling.checked = spellingIn.checked;
      rootSpelling.dispatchEvent(new Event('change'));
      if (!panel.hidden) render();
    });
    rootSpelling.addEventListener('change', function () {
      spellingIn.checked = rootSpelling.checked;
      if (!panel.hidden) render();
    });
    spellingIn.checked = rootSpelling.checked;
  }
  window.addEventListener('pagehide', function () { synth.close(); });
})();