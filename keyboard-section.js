// Teclado expandible: piano de varias octavas que cubre el mástil y se toca
// con el teclado físico (a s d f g h j = do re mi fa sol la si; w e t y u =
// sostenidos) o con el puntero. Shift izquierdo baja una octava, derecho la
// sube. Sintetizador polifónico con timbres y efectos delay/reverb.
// La lógica pura y el sintetizador se exportan para pruebas sin navegador.

var WHITE_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
var BLACK_SPECS = [[1, 1], [3, 2], [6, 4], [8, 5], [10, 6]];
var KEY_OFFSETS = { a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12, o: 13, l: 14, p: 15, ';': 16 };
var KEYBOARD_NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

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

function KeySynth(options) {
  options = options || {};
  this.createContext = options.createContext || (function () { return new (window.AudioContext || window.webkitAudioContext)(); });
  this.timbre = options.timbre || 'piano';
  this.delay = Boolean(options.delay);
  this.reverb = Boolean(options.reverb);
  this.volume = typeof options.volume === 'number' ? options.volume : 0.3;
  this.voices = new Map();
  this.voiceSequence = 0;
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
KeySynth.prototype.noteOn = function (midi) {
  var self = this;
  if (!Number.isInteger(midi) || midi < 0 || midi > 127) return Promise.resolve(false);
  return this.ensure().then(function () {
    if (!self.context || self.voices.has(midi)) return false;
    var ctx = self.context, t = ctx.currentTime || 0;
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
KeySynth.prototype.noteOff = function (midi) {
  var voice = this.voices.get(midi);
  if (!voice || !this.context) return;
  this.voices.delete(midi);
  var ctx = this.context, t = ctx.currentTime || 0, release = this.releaseTime();
  voice.gain.gain.cancelScheduledValues(t);
  voice.gain.gain.setTargetAtTime(0, t, release);
  voice.nodes.forEach(function (node) { node.osc.stop(t + release * 6 + 0.05); });
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
};

if (typeof module !== 'undefined' && module.exports) module.exports = {
  WHITE_SEMITONES: WHITE_SEMITONES,
  BLACK_SPECS: BLACK_SPECS,
  KEY_OFFSETS: KEY_OFFSETS,
  keyboardMidiFor: keyboardMidiFor,
  keyStrip: keyStrip,
  keyLetter: keyLetter,
  activeBaseMidi: activeBaseMidi,
  mastilKeyToggle: mastilKeyToggle,
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
    if (open) render();
    else { synth.allOff(); clearMastil(); }
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
  // resaltado de las notas que siguen sonando, igual que hace el micrófono.
  var playingMidis = function () {
    var list = [];
    pressed.forEach(function (midi) { list.push(midi); });
    return list.concat(pointerNotes);
  };
  var mastilObserver = new MutationObserver(function () {
    playingMidis().forEach(function (midi) { applyMastil(midi, true); });
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
    applyMastil(midi, true);
    synth.noteOn(midi).then(function () { setPlaying(midi, true); });
  }
  function onPointerEnd() {
    pointerNotes.forEach(function (midi) {
      synth.noteOff(midi);
      applyMastil(midi, false);
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
    if (panel.hidden) return;
    var target = event.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
    if (event.altKey || event.metaKey || event.ctrlKey) return;
    var key = event.key.toLowerCase();
    var offset = KEY_OFFSETS[key];
    if (offset === undefined) return;
    var midi = effectiveBase() + offset;
    if (midi < 0 || midi > 127) return;
    if (!pressed.has(key)) {
      pressed.set(key, midi);
      applyMastil(midi, true);
      synth.noteOn(midi).then(function () { setPlaying(midi, true); });
    }
    event.preventDefault();
  });
  window.addEventListener('keyup', function (event) {
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
      if (event.code === 'ShiftLeft') shiftLeft = false; else shiftRight = false;
      if (!panel.hidden) render();
      return;
    }
    if (panel.hidden) return;
    var key = event.key.toLowerCase();
    var offset = KEY_OFFSETS[key];
    if (offset === undefined) return;
    if (!pressed.has(key)) return;
    var midi = pressed.get(key);
    pressed.delete(key);
    synth.noteOff(midi);
    applyMastil(midi, false);
    setPlaying(midi, false);
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