// Teclado expandible: piano de varias octavas que cubre el mástil y se toca
// con el teclado físico o con el puntero. Con la sección cerrada, las mismas
// teclas tocan el mástil con el sonido del instrumento elegido (guitarra o
// bajo). Teclas naturales: z x c v b n m (octava grave), a s d f g h j k l ñ
// { (media y aguda); sostenidos: w e t y u o p ´ +. Shift izquierdo baja una
// octava y derecho la sube. Sintetizador polifónico con timbres y efectos.
// La lógica pura y el sintetizador se exportan para pruebas sin navegador.

var WHITE_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
var BLACK_SPECS = [[1, 1], [3, 2], [6, 4], [8, 5], [10, 6]];
var KEY_OFFSETS = { a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12, o: 13, l: 14, p: 15, ñ: 16, ';': 16, '{': 17, '´': 18, '+': 20, z: -12, x: -10, c: -8, v: -7, b: -5, n: -3, m: -1 };
// Posiciones físicas que cambian de carácter según el idioma del teclado y
// palabras muertas (acentos), identificadas por código en vez de por letra.
var KEY_CODES = { Semicolon: 16, Quote: 17, BracketLeft: 18, Equal: 20 };
var KEYBOARD_NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Offset para una tecla según su letra o, si esa posición no tiene letra fija
// (ñ, ´, etc. cambian según el idioma), según la posición física de la tecla.
function keyOffsetFor(event) {
  var byKey = KEY_OFFSETS[event.key.toLowerCase()];
  if (byKey !== undefined) return byKey;
  return KEY_CODES[event.code];
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
  mastilKeyToggle: mastilKeyToggle,
  pluckWave: pluckWave,
  KeySynth: KeySynth,
  noteNames: KEYBOARD_NOTE_NAMES
};

if (typeof document !== 'undefined') (function () {
  var panel = document.getElementById('keyboard-section');
  var toggle = document.getElementById('keyboard-toggle');
  if (!panel || !toggle) return;
  var keysEl = document.getElementById('keyboard-keys');
  var rangeEl = document.getElementById('keyboard-range');
  var octaveEl = document.getElementById('keyboard-octave');
  var timbreSel = document.getElementById('keyboard-timbre');
  var delayIn = document.getElementById('keyboard-delay');
  var reverbIn = document.getElementById('keyboard-reverb');
  var closeBtn = document.getElementById('keyboard-close');

  var OCTAVE_START = 3, OCTAVE_COUNT = 4;
  var baseMidi = keyboardMidiFor(4, 0);
  var shiftLeft = false, shiftRight = false;
  var synth = new KeySynth({ timbre: timbreSel ? timbreSel.value : 'piano' });
  var pressed = new Map();
  var pointerNotes = [];

  function shiftDirection() { return shiftRight ? 1 : shiftLeft ? -1 : 0; }
  function effectiveBase() { return activeBaseMidi(baseMidi, shiftDirection(), OCTAVE_START, OCTAVE_COUNT); }

  function setExpanded(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.classList.toggle('is-open', open);
    toggle.textContent = open ? '✕ Teclado' : '⤢ Teclado';
    document.querySelector('.fretboard-section')?.classList.toggle('keyboard-open', open);
    if (open) { render(); clearMastil(); }
    else { synth.allOff(); clearMastil(); }
  }

  // Modo mástil: con el teclado cerrado, las mismas teclas marcan la nota
  // pulsada en el mástil de guitarra/bajo en vez de un piano, y suenan con el
  // timbre del instrumento activo.
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

  function keyButton(key) {
    var white = key.pitchClass === 0 || key.pitchClass === 2 || key.pitchClass === 4 || key.pitchClass === 5 || key.pitchClass === 7 || key.pitchClass === 9 || key.pitchClass === 11;
    var label = KEYBOARD_NOTE_NAMES[key.pitchClass];
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

  window.addEventListener('keydown', function (event) {
    if (event.code === 'ShiftLeft') { shiftLeft = true; if (!panel.hidden) render(); return; }
    if (event.code === 'ShiftRight') { shiftRight = true; if (!panel.hidden) render(); return; }
    var target = event.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
    if (event.altKey || event.metaKey || event.ctrlKey) return;
    var offset = keyOffsetFor(event);
    if (offset === undefined) return;
    var base = inMastilMode() ? mastilBaseMidi() : effectiveBase();
    var midi = base + offset;
    if (midi < 0 || midi > 127) return;
    if (!pressed.has(event.key)) {
      pressed.set(event.key, midi);
      if (inMastilMode()) { applyMastil(midi, true); synth.noteOn(midi, mastilTimbre()); }
      else synth.noteOn(midi).then(function () { setPlaying(midi, true); });
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
  });

  keysEl.addEventListener('pointerdown', onPointerDown);
  keysEl.addEventListener('pointerup', onPointerEnd);
  keysEl.addEventListener('pointercancel', onPointerEnd);
  keysEl.addEventListener('pointerleave', onPointerEnd);

  if (timbreSel) timbreSel.addEventListener('change', function () { synth.setTimbre(timbreSel.value); });
  if (delayIn) delayIn.addEventListener('change', function () { synth.setDelay(delayIn.checked); });
  if (reverbIn) reverbIn.addEventListener('change', function () { synth.setReverb(reverbIn.checked); });
  if (closeBtn) closeBtn.addEventListener('click', function () { setExpanded(false); toggle.focus(); });
  toggle.addEventListener('click', function () { setExpanded(panel.hidden); });
  window.addEventListener('pagehide', function () { synth.close(); });
})();