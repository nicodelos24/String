const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { keyStrip, keyLetter, activeBaseMidi, mastilBaseDrop, keyboardMidiFor, KEY_OFFSETS, KeySynth, keyboardLayoutClasses } = require('../keyboard-section.js');

test('keyboard: the strip builds 7 white and 5 black keys per octave with ascending MIDI', () => {
  const strip = keyStrip(3, 2, 60);
  assert.equal(strip.whites.length, 14);
  assert.equal(strip.blacks.length, 10);
  assert.equal(strip.totalWhite, 14);
  assert.equal(strip.whites[0].midi, 48);
  assert.equal(strip.whites[13].midi, 71);
  assert.equal(strip.blacks[0].midi, 49);
  const semitones = strip.whites.map(k => k.pitchClass);
  assert.deepEqual(semitones.slice(0, 7), [0, 2, 4, 5, 7, 9, 11]);
  assert.deepEqual(semitones.slice(7), [0, 2, 4, 5, 7, 9, 11]);
});

test('keyboard: a, s, d, f, g, h, j map to C, D, E, F, G, A, B and w, e, r, u to the accidentals at the active base (a=do central)', () => {
  const baseC4 = keyboardMidiFor(4, 0); // 60 = do C4
  assert.equal(KEY_OFFSETS.a, 0);
  assert.equal(KEY_OFFSETS.s, 2);
  assert.equal(KEY_OFFSETS.d, 4);
  assert.equal(KEY_OFFSETS.f, 5);
  assert.equal(KEY_OFFSETS.g, 7);
  assert.equal(KEY_OFFSETS.h, 9);
  assert.equal(KEY_OFFSETS.j, 11);
  assert.equal(KEY_OFFSETS.w, 1, 'w=do#/reb sobre a');
  assert.equal(KEY_OFFSETS.e, 3, 'e=re#/mib sobre s');
  assert.equal(KEY_OFFSETS.t, 6, 't=fa#/solb, la columna de mi no tiene tecla negra');
  assert.equal(KEY_OFFSETS.y, 8, 'y=sol#/lab sobre f');
  assert.equal(KEY_OFFSETS.u, 10, 'u=la#/sib sobre g');
  assert.equal(baseC4 + KEY_OFFSETS.a, 60);
  assert.equal(baseC4 + KEY_OFFSETS.w, 61); // C#4
  assert.equal(baseC4 + KEY_OFFSETS.s, 62); // D4
  assert.equal(baseC4 + KEY_OFFSETS.e, 63); // D#4
  assert.equal(baseC4 + KEY_OFFSETS.d, 64); // E4
  assert.equal(baseC4 + KEY_OFFSETS.f, 65); // F4
  assert.equal(baseC4 + KEY_OFFSETS.t, 66); // F#4
  assert.equal(baseC4 + KEY_OFFSETS.g, 67); // G4
  assert.equal(baseC4 + KEY_OFFSETS.h, 69); // A4
  assert.equal(baseC4 + KEY_OFFSETS.j, 71); // B4
});

test('keyboard: en el mástil la guitarra suena una octava más abajo y el bajo no se mueve', () => {
  const baseC4 = keyboardMidiFor(4, 0);
  // Modo «Mástil»: las teclas tocan el mástil.
  assert.equal(mastilBaseDrop('guitar', true), 12, 'la guitarra baja una octava');
  assert.equal(baseC4 - mastilBaseDrop('guitar', true), 48, 'a = do3 en vez de do4');
  assert.equal(mastilBaseDrop('bass', true), 0, 'el bajo se queda en la base del piano');
  // Modos «Teclado» y «Ambos»: las teclas tocan el piano, que no se mueve.
  assert.equal(mastilBaseDrop('guitar', false), 0, 'el piano no baja');
  assert.equal(mastilBaseDrop('bass', false), 0);
  // Con la guitarra en el mástil, asdfg queda una octava más abajo.
  assert.equal(KEY_OFFSETS.a - mastilBaseDrop('guitar', true), -12);
  assert.equal(KEY_OFFSETS.g - mastilBaseDrop('guitar', true), -5);
});

test('keyboard: letters are labelled only inside the active window', () => {
  const baseC4 = keyboardMidiFor(4, 0);
  assert.equal(keyLetter(baseC4, baseC4), 'a');
  assert.equal(keyLetter(baseC4 + 2, baseC4), 's');
  assert.equal(keyLetter(baseC4 + 4, baseC4), 'd');
  assert.equal(keyLetter(baseC4 + 1, baseC4), 'w');
  assert.equal(keyLetter(baseC4 + 16, baseC4), 'ñ');
  assert.equal(keyLetter(baseC4 - 7, baseC4), 'z');
  assert.equal(keyLetter(36, baseC4), '', 'fuera de la ventana activa');
  assert.equal(keyLetter(100, baseC4), '');
});

test('keyboard: la fila grave arranca en fa (z=F3) y la superior son los sostenidos ascendentes', () => {
  const { KEY_OFFSETS, KEY_CODES } = require('../keyboard-section.js');
  assert.equal(KEY_OFFSETS.z, -7); // F3
  assert.equal(KEY_OFFSETS.x, -5); // G3
  assert.equal(KEY_OFFSETS.c, -3); // A3
  assert.equal(KEY_OFFSETS.v, -1); // B3
  assert.equal(KEY_OFFSETS.b, 0);  // C4, repite la fila media
  assert.equal(KEY_OFFSETS.n, 2);  // D4, repite la fila media
  assert.equal(KEY_OFFSETS.m, 4);  // E4
  assert.equal(KEY_OFFSETS[','], 5); // F4
  assert.equal(KEY_OFFSETS['.'], 7); // G4
  assert.equal(KEY_OFFSETS['-'], 9); // A4, repite la fila media
  assert.equal(KEY_OFFSETS.o, 13);  // C#5
  assert.equal(KEY_OFFSETS.p, 15);  // D#5
  assert.equal(KEY_OFFSETS['´'], 18); // F#5
  assert.equal(KEY_OFFSETS['+'], 20); // G#5
  assert.equal(KEY_OFFSETS.i, undefined, 'i no está en la asignación antigua');
  assert.equal(KEY_OFFSETS.ñ, KEY_OFFSETS[';'], 'ñ es la posición de ; en teclado español');
  assert.equal(KEY_CODES.Semicolon, 16); // ñ → E5
  assert.equal(KEY_CODES.Quote, 17);     // comilla → D5
  assert.equal(KEY_CODES.BracketLeft, 18); // ´ → D#5
  assert.equal(KEY_CODES.Equal, 20);       // + → F#5
});

test('keyboard: chordFromNotes con 2 notas reconoce raíz y tercera (mayor o menor)', () => {
  const { chordFromNotes } = require('../keyboard-section.js');
  const templates = [];

  assert.deepEqual(chordFromNotes([60, 64], templates), { root: 0, type: 'maj', mode: 'ionian' }, 'do mi = do mayor');
  assert.deepEqual(chordFromNotes([64, 60], templates), { root: 0, type: 'maj', mode: 'ionian' }, 'sin importar el orden');
  assert.deepEqual(chordFromNotes([60, 63], templates), { root: 0, type: 'm', mode: 'aeolian' }, 'do mib = do menor');
  assert.deepEqual(chordFromNotes([59, 62], templates), { root: 11, type: 'm', mode: 'aeolian' }, 'si re = si menor');
  assert.deepEqual(chordFromNotes([47, 50], templates), { root: 11, type: 'm', mode: 'aeolian' }, 'la nota más grave manda');
  assert.equal(chordFromNotes([55, 60], templates), null, 'quinta sin tercera no da acorde');
  assert.equal(chordFromNotes([60, 72], templates), null, 'octava de la misma nota no alcanza');
  assert.equal(chordFromNotes([60, 61], templates), null, 'segunda menor no es tercera');
});

test('keyboard: chordFromNotes con 3 o más notas usa las plantillas', () => {
  const { chordFromNotes } = require('../keyboard-section.js');
  const templates = [
    { type: 'maj', intervals: [0, 4, 7], mode: 'ionian' },
    { type: 'm', intervals: [0, 3, 7], mode: 'aeolian' },
    { type: '7', intervals: [0, 4, 7, 10], mode: 'mixolydian' },
    { type: 'maj7', intervals: [0, 4, 7, 11], mode: 'ionian' },
    { type: 'm7', intervals: [0, 3, 7, 10], mode: 'aeolian' },
    { type: '6', intervals: [0, 4, 7, 9], mode: 'ionian' },
    { type: '6/9', intervals: [0, 4, 7, 9, 2], mode: 'ionian' },
    { type: 'sus4', intervals: [0, 5, 7], mode: 'mixolydian' },
  ];
  assert.deepEqual(chordFromNotes([60, 64, 67, 72], templates), { root: 0, type: 'maj', mode: 'ionian' }, 'C E G (con octava)');
  assert.deepEqual(chordFromNotes([48, 60, 64, 67], templates), { root: 0, type: 'maj', mode: 'ionian' }, 'C2/C3 E G');
  assert.deepEqual(chordFromNotes([59, 62, 66], templates), { root: 11, type: 'm', mode: 'aeolian' }, 'si re fa# = Bm');
  assert.deepEqual(chordFromNotes([48, 52, 55, 58], templates), { root: 0, type: '7', mode: 'mixolydian' }, 'do mi sol sib = C7');
  assert.deepEqual(chordFromNotes([60, 64, 67, 69], templates), { root: 0, type: '6', mode: 'ionian' }, 'do mi sol la = C6');
  assert.deepEqual(chordFromNotes([60, 64, 67, 69, 74], templates), { root: 0, type: '6/9', mode: 'ionian' }, 'do mi sol la re = C6/9');
  assert.deepEqual(chordFromNotes([60, 65, 67], templates), { root: 0, type: 'sus4', mode: 'mixolydian' }, 'do fa sol = Csus4');
  assert.deepEqual(chordFromNotes([57, 60, 64], templates), { root: 9, type: 'm', mode: 'aeolian' }, 'la do mi = Am');
  assert.equal(chordFromNotes([57, 60, 62], templates), null, 'la-do-re sin quinta no da acorde');
});

test('keyboard: la fase Acorde reconoce séptimas, disminuidos y compuestos con las plantillas del micrófono', () => {
  const { chordFromNotes } = require('../keyboard-section.js');
  const { LIVE_CHORD_TEMPLATES } = require('../chord-detection.js');
  assert.deepEqual(chordFromNotes([60, 64, 67, 70], LIVE_CHORD_TEMPLATES), { root: 0, type: '7', mode: 'mixolydian' }, 'do mi sol sib = C7');
  assert.deepEqual(chordFromNotes([60, 64, 67, 71], LIVE_CHORD_TEMPLATES), { root: 0, type: 'maj7', mode: 'ionian' }, 'do mi sol si = Cmaj7');
  assert.deepEqual(chordFromNotes([60, 63, 66], LIVE_CHORD_TEMPLATES), { root: 0, type: 'dim', mode: 'locrian' }, 'do mib solb = Cdim');
  assert.deepEqual(chordFromNotes([60, 63, 66, 69], LIVE_CHORD_TEMPLATES), { root: 0, type: 'dim7', mode: 'locrian' }, 'do mib solb la = Cdim7');
  assert.deepEqual(chordFromNotes([60, 63, 66, 70], LIVE_CHORD_TEMPLATES), { root: 0, type: 'm7b5', mode: 'locrian' }, 'do mib solb sib = Cm7b5');
  assert.deepEqual(chordFromNotes([60, 64, 68], LIVE_CHORD_TEMPLATES), { root: 0, type: 'aug', mode: 'ionian' }, 'do mi sol# = Caug');
  assert.deepEqual(chordFromNotes([60, 64, 67, 69, 74], LIVE_CHORD_TEMPLATES), { root: 0, type: '6/9', mode: 'ionian' }, 'do mi sol la re = C6/9');
  assert.deepEqual(chordFromNotes([60, 63, 67, 70, 74], LIVE_CHORD_TEMPLATES), { root: 0, type: 'm9', mode: 'dorian' }, 'do mib sol sib re = Cm9');
  assert.deepEqual(chordFromNotes([60, 65, 67, 70], LIVE_CHORD_TEMPLATES), { root: 0, type: '7sus4', mode: 'mixolydian' }, 'do fa sol sib = C7sus4');
});

test('keyboard: liveNoteChord detecta el acorde real con dos o más notas y devuelve null con una sola', () => {
  const { liveNoteChord } = require('../keyboard-section.js');
  const { LIVE_CHORD_TEMPLATES } = require('../chord-detection.js');
  assert.equal(liveNoteChord([60]), null, 'una sola nota no alcanza: delega a la calidad elegida');
  assert.equal(liveNoteChord([]), null, 'sin notas no hay acorde');
  assert.deepEqual(liveNoteChord([60, 64], LIVE_CHORD_TEMPLATES), { root: 0, type: 'maj', mode: 'ionian' }, 'do mi = do mayor');
  assert.deepEqual(liveNoteChord([60, 63], LIVE_CHORD_TEMPLATES), { root: 0, type: 'm', mode: 'aeolian' }, 'do mib = do menor');
  assert.deepEqual(liveNoteChord([48, 52, 55, 58], LIVE_CHORD_TEMPLATES), { root: 0, type: '7', mode: 'mixolydian' }, 'do mi sol sib = C7');
  assert.deepEqual(liveNoteChord([60, 63, 66, 69], LIVE_CHORD_TEMPLATES), { root: 0, type: 'dim7', mode: 'locrian' }, 'do mib solb la = Cdim7');
  assert.equal(liveNoteChord([55, 60], LIVE_CHORD_TEMPLATES), null, 'quinta sin tercera no acertaría; se vuelve a la calidad elegida');
});

test('keyboard: keyOffsetFor usa la letra o la posición física como respaldo', () => {
  const { keyOffsetFor } = require('../keyboard-section.js');
  assert.equal(keyOffsetFor({ key: 'a', code: 'KeyA' }), 0);
  assert.equal(keyOffsetFor({ key: 'ñ', code: 'Semicolon' }), 16);
  assert.equal(keyOffsetFor({ key: 'Z', code: 'KeyZ' }), -7);
  assert.equal(keyOffsetFor({ key: 'z', code: 'KeyZ' }), -7);
  assert.equal(keyOffsetFor({ key: 'Dead', code: 'BracketLeft' }), 18, 'tecla de acento muerto ´ por posición');
  assert.equal(keyOffsetFor({ key: '{', code: 'BracketLeft' }), 17, 'la letra tiene prioridad sobre la posición');
  assert.equal(keyOffsetFor({ key: '+', code: 'Equal' }), 20);
  assert.equal(keyOffsetFor({ key: 'q', code: 'KeyQ' }), undefined, 'q no está en la asignación antigua');
});

test('keyboard: la fila grave empieza en fa y la fila media se queda como estaba', () => {
  // La fila grave se corrió a petición del autor: z x c v = fa sol la si, de modo
  // que con la guitarra en «Mástil» «z» cae en la sexta cuerda en el primer traste y
  // «c», «n» y «.» en la quinta, la cuarta y la tercera al aire. La fila media y la
  // de sostenidos no se tocan.
  const { keyOffsetFor } = require('../keyboard-section.js');
  const nota=(key,code)=>60+keyOffsetFor({key,code});
  // Fila grave, en MIDI y en nombre: fa3 sol3 la3 si3 do4 re4 mi4 fa4 sol4 la4.
  assert.deepEqual(
    [['z','KeyZ'],['x','KeyX'],['c','KeyC'],['v','KeyV'],['b','KeyB'],['n','KeyN'],['m','KeyM'],[',','Comma'],['.','Period'],['-','Minus']]
      .map(([key,code])=>nota(key,code)),
    [53, 55, 57, 59, 60, 62, 64, 65, 67, 69]);
  // Fila media: do4 a fa5, sin cambios.
  assert.deepEqual(
    ['a','s','d','f','g','h','j','k','l','ñ','{'].map((key,i)=>nota(key,i===9?'Semicolon':'Key'+i)),
    [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77]);
  // Sostenidos: do#4 a sol#5, sin cambios.
  assert.deepEqual(['w','e','t','y','u','o','p'].map((key,i)=>nota(key,'KeyW'+i)),
    [61, 63, 66, 68, 70, 73, 75]);
  // Ninguna nota se repite dentro de la fila grave, que es lo que la hace usable
  // como fila: si dos teclas dieran la misma, una no serviría de nada.
  const graves=[53, 55, 57, 59, 60, 62, 64, 65, 67, 69];
  assert.equal(new Set(graves).size,graves.length);
  // Con la guitarra en el mástil (una octava más abajo) «z» es la sexta cuerda en el
  // primer traste y «c», «n» y «.» son la quinta, la cuarta y la tercera al aire,
  // que es la razón del cambio.
  assert.equal(53-12,41,'z suena como la sexta cuerda en el primer traste');
  assert.equal(57-12,45,'c suena como la quinta cuerda al aire');
  assert.equal(62-12,50,'n suena como la cuarta cuerda al aire');
  assert.equal(67-12,55,'el punto suena como la tercera cuerda al aire');
  // Qué teclas de la fila grave repiten una de la fila media. Cambia con el
  // mapeo, y son las que el piano no rotula, así que conviene tenerlo escrito y no
  // deducirlo: ahora la fila llega hasta la4 y alcanza la fila media más arriba.
  // `in` buscaría por nombre de propiedad y aquí las claves son letras, así que se
  // compara por valor: lo que se pregunta es si el offset está en la fila media.
  const media=[0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17];
  const filaGrave=[['z',-7],['x',-5],['c',-3],['v',-1],['b',0],['n',2],['m',4],[',',5],['.',7],['-',9]];
  const repetidas=filaGrave.filter(([,offset])=>media.includes(offset)).map(([key])=>key);
  assert.deepEqual(repetidas,['b','n','m',',','.','-'],'las que repiten la fila media son seis ahora');
  // Y las cuatro de verdad nuevas, las que no tienen tecla propia más arriba.
  assert.deepEqual(filaGrave.filter(([,offset])=>!media.includes(offset)).map(([key])=>key),['z','x','c','v']);
});

test('keyboard: keyTargetIsTyping deja tocar tras hacer clic en switchs y volumen, pero no sobre campos de texto', () => {
  const { keyTargetIsTyping } = require('../keyboard-section.js');
  const el = (tagName, type, extra) => Object.assign({ tagName, type: type, isContentEditable: false }, extra || {});
  assert.equal(keyTargetIsTyping(el('INPUT', 'checkbox')), false, 'un switch no bloquea las teclas');
  assert.equal(keyTargetIsTyping(el('INPUT', 'radio')), false, 'un radio no bloquea las teclas');
  assert.equal(keyTargetIsTyping(el('INPUT', 'range')), false, 'el slider de volumen no bloquea las teclas');
  assert.equal(keyTargetIsTyping(el('BUTTON')), false, 'un botón no bloquea las teclas');
  assert.equal(keyTargetIsTyping(el('BODY')), false, 'el cuerpo no bloquea las teclas');
  assert.equal(keyTargetIsTyping(null), false, 'sin foco no bloquea');
  assert.equal(keyTargetIsTyping(el('INPUT', 'text')), true, 'un campo de texto bloquea');
  assert.equal(keyTargetIsTyping(el('INPUT', 'number')), true, 'un campo numérico bloquea (para tipear BPM)');
  assert.equal(keyTargetIsTyping(el('INPUT', 'url')), true);
  assert.equal(keyTargetIsTyping(el('INPUT', 'file')), true);
  assert.equal(keyTargetIsTyping(el('SELECT')), true, 'un select bloquea para no disparar su salto por tecla');
  assert.equal(keyTargetIsTyping(el('TEXTAREA')), true);
  assert.equal(keyTargetIsTyping(el('DIV', undefined, { isContentEditable: true })), true);
  assert.equal(keyTargetIsTyping(el('INPUT', undefined)), true, 'un input sin type se trata como texto');
});

test('keyboard: Re Pág baja una octava completa y Av Pág la sube, sin recortar a la ventana', () => {
  assert.equal(activeBaseMidi(60, -1, 3, 4), 48);
  assert.equal(activeBaseMidi(60, 1, 3, 4), 72);
  assert.equal(activeBaseMidi(48, -1, 3, 4), 36, 'baja una octava completa aunque quede fuera de la ventana');
  assert.equal(activeBaseMidi(72, 1, 3, 4), 84, 'sube una octava completa aunque quede fuera de la ventana');
});

test('keyboard: la octava se mueve con Re Pág y Av Pág, y ya no con Shift', () => {
  const { isOctaveKey, isShiftKey } = require('../keyboard-section.js');
  assert.equal(isOctaveKey('PageDown'), true, 'Re Pág baja la octava');
  assert.equal(isOctaveKey('PageUp'), true, 'Av Pág sube la octava');
  assert.equal(isOctaveKey('ShiftLeft'), false, 'Shift ya no mueve la octava: alterna el micrófono');
  assert.equal(isOctaveKey('ShiftRight'), false);
  assert.equal(isOctaveKey('KeyA'), false, 'una letra no mueve la octava');
  assert.equal(isOctaveKey('ArrowUp'), false, 'las flechas belonged al video flotante');
  assert.equal(isShiftKey('ShiftLeft'), true);
  assert.equal(isShiftKey('ShiftRight'), true);
  assert.equal(isShiftKey('KeyA'), false);
});

test('keyboard: un toque de Shift alterna el micrófono, pero Shift+letra no', () => {
  const { shiftTapToggles } = require('../keyboard-section.js');
  assert.equal(shiftTapToggles(true, false), true, 'Shift solo, sin tocar nada más: es un toque');
  assert.equal(shiftTapToggles(true, true), false, 'en el latam, Shift+letra escribe «+» o «}»: no alterna nada');
  assert.equal(shiftTapToggles(false, false), false, 'sin Shift no hay toque');
  assert.equal(shiftTapToggles(false, true), false);
});

test('keyboard: Enter y Espacio se apartan donde el navegador ya les da otro significado', () => {
  const { keyTargetOwnsChordAdd } = require('../keyboard-section.js');
  const el = (tagName, extra) => Object.assign({ tagName, isContentEditable: false, getAttribute: () => null }, extra || {});
  assert.equal(keyTargetOwnsChordAdd(el('BUTTON')), true, 'un botón se activa con Espacio o Enter');
  assert.equal(keyTargetOwnsChordAdd(el('A')), true, 'un enlace se activa con Enter');
  assert.equal(keyTargetOwnsChordAdd(el('SUMMARY')), true, 'el «?» de la ayuda se despliega con Espacio');
  assert.equal(keyTargetOwnsChordAdd(el('INPUT', { type: 'checkbox' })), true, 'un switch se marca con Espacio');
  assert.equal(keyTargetOwnsChordAdd(el('INPUT', { type: 'text' })), true, 'un campo de texto escribe un espacio');
  assert.equal(keyTargetOwnsChordAdd(el('SELECT')), true, 'un select ya lo cubre keyTargetIsTyping');
  assert.equal(keyTargetOwnsChordAdd(el('DIV', { getAttribute: () => 'switch' })), true, 'un rol de switch se marca con Espacio');
  assert.equal(keyTargetOwnsChordAdd(el('DIV', { getAttribute: () => 'button' })), true);
  assert.equal(keyTargetOwnsChordAdd(el('DIV')), false, 'una tarjeta o el mástil no activan nada con Espacio');
  assert.equal(keyTargetOwnsChordAdd(el('BODY')), false, 'sin nada enfocado, el atajo manda');
  assert.equal(keyTargetOwnsChordAdd(null), false);
});

test('keyboard: el acorde que añaden Enter y Espacio es el del teclado en vivo si lo hay, y si no el seleccionado', () => {
  const { recognizedChordSource } = require('../keyboard-section.js');
  assert.equal(recognizedChordSource(true, true), 'live', 'con «Acorde en vivo» activo y notas se añade ese acorde');
  assert.equal(recognizedChordSource(true, false), 'selected', '«Acorde en vivo» activo pero sin notas: el seleccionado');
  assert.equal(recognizedChordSource(false, true), 'selected', 'acorde en vivo apagado: manda el seleccionado, no el del teclado');
  assert.equal(recognizedChordSource(false, false), 'selected');
});

// QA-SPACE-01 / T-37: la decisión «capturar o dejar al transporte».
test('keyboard: Espacio sobre el transporte pasa al atajo solo con una captura en vivo activa', () => {
  const { transportSpaceCaptures } = require('../keyboard-section.js');
  assert.equal(transportSpaceCaptures(true, true), true, 'con captura en vivo activa: la tecla agrega el acorde en vez de activar Play');
  assert.equal(transportSpaceCaptures(true, false), false, 'sin captura: el transporte conserva su Espacio nativo');
  assert.equal(transportSpaceCaptures(false, true), false, 'el foco en otro control no convierte a ese botón en atajo global');
  assert.equal(transportSpaceCaptures(false, false), false);
});

// QA-SPACE-01: el alcance no convierte cada botón de la app en un atajo global.
test('keyboard: es transporte, para Espacio, solo el play rápido y sus tres play equivalentes del panel', () => {
  const { isTransportPlayControl } = require('../keyboard-section.js');
  const el = id => ({ id, tagName: 'BUTTON' });
  assert.equal(isTransportPlayControl(el('quick-play')), true, 'el transporte rápido junto al mástil');
  assert.equal(isTransportPlayControl(el('tempo-play')), true, 'el duplicado del play atado arriba del Tempo (T-23)');
  assert.equal(isTransportPlayControl(el('player-toggle')), true, 'el play del transporte de Backtrack');
  assert.equal(isTransportPlayControl(el('midi-play')), true, 'el play del transporte de MIDI');
  assert.equal(isTransportPlayControl(el('metronome-toggle')), true, 'el play del panel del metrónomo');
  assert.equal(isTransportPlayControl(el('add-chord')), false, 'añadir acorde no es reproducción');
  assert.equal(isTransportPlayControl(el('legend-add-chord')), false, 'el añadir acorde del mástil tampoco');
  assert.equal(isTransportPlayControl(el('theme-toggle')), false, 'los demás botones de la app no son transporte');
  assert.equal(isTransportPlayControl(el('')), false);
  assert.equal(isTransportPlayControl(null), false);
});

test('keyboard: los tres modos ocultan o muestran el panel y la clase del mástil', () => {
  assert.deepEqual(keyboardLayoutClasses('mastil'), { hidden: true, open: false, split: false }, 'solo mástil: el panel queda oculto');
  assert.deepEqual(keyboardLayoutClasses('teclado'), { hidden: false, open: true, split: false }, 'teclado: el piano reemplaza el mástil');
  assert.deepEqual(keyboardLayoutClasses('ambos'), { hidden: false, open: false, split: true }, 'ambos: el piano se muestra junto al mástil');
  assert.deepEqual(keyboardLayoutClasses('otro'), { hidden: false, open: true, split: false }, 'modo desconocido recurre al reemplazo como comportamiento seguro');
});

test('keyboard synth: hard-clamped octaves do not stay stuck and invalid notes never start audio', async () => {
  const synth = new KeySynth({ createContext: () => { throw new Error('Unexpected audio'); } });
  await synth.noteOn(-1);
  await synth.noteOn(200);
  assert.equal(synth.voices.size, 0);
});

test('keyboard synth: noteOn starts a voice per MIDI, noteOff releases it and allOff clears', async () => {
  const oscillators = [];
  const parameter = () => ({ setValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
  const ctx = {
    currentTime: 0,
    destination: {},
    sampleRate: 44100,
    resume: async () => {},
    createGain: () => ({ gain: parameter(), connect() {}, disconnect() {} }),
    createOscillator: () => {
      const osc = { type: '', frequency: { _value: 0, setValueAtTime(v) { this._value = v; } }, connect() {}, start() {}, stop(time) { this.stopTime = time; } };
      oscillators.push(osc);
      return osc;
    },
  };
  const synth = new KeySynth({ createContext: () => ctx });
  await synth.noteOn(60);
  await synth.noteOn(64);
  assert.equal(synth.voices.size, 2);
  assert.equal(oscillators.length, 6);
  const freqs = oscillators.map(o => Math.round(o.frequency._value));
  assert(freqs.includes(262)); // C4
  assert(freqs.includes(330)); // E4
  synth.noteOff(60);
  assert.equal(synth.voices.size, 1);
  assert(oscillators.slice(0, 3).every(o => o.stopTime !== undefined));
  synth.allOff();
  assert.equal(synth.voices.size, 0);
});

test('keyboard: resalta en el mástil solo las posiciones del mismo MIDI sin tocar el resaltado del micrófono', () => {
  const { mastilKeyToggle } = require('../keyboard-section.js');
  const makeNote = midi => ({
    dataset: { midi: String(midi) },
    classList: {
      set: new Set(),
      contains(c) { return this.set.has(c); },
      add(c) { this.set.add(c); },
      remove(c) { this.set.delete(c); },
    },
  });
  const notes = [makeNote(60), makeNote(60), makeNote(62), makeNote(62)];
  notes[3].classList.add('live'); // resaltado previo del micrófono
  assert.equal(mastilKeyToggle(notes, 60, true), 2);
  assert(notes[0].classList.contains('keyboard-live'));
  assert(notes[1].classList.contains('keyboard-live'));
  assert(!notes[2].classList.contains('keyboard-live'));
  assert(notes[3].classList.contains('live'), 'el resaltado del micrófono queda intacto');
  assert.equal(mastilKeyToggle(notes, 60, true), 0, 'ya resaltadas no cuentan como cambio');
  assert.equal(mastilKeyToggle(notes, 60, false), 2);
  assert(!notes[0].classList.contains('keyboard-live'));
  assert(!notes[1].classList.contains('keyboard-live'));
  assert.equal(mastilKeyToggle(notes, 60, false), 0);
  assert.equal(mastilKeyToggle(notes, 200, true), 0, 'un MIDI fuera del rango del mástil no resalta nada');
});

test('keyboard synth: guitarra y bajo usan una cuerda pulsada que decae y se normaliza', () => {
  const { pluckWave } = require('../keyboard-section.js');
  // PRNG determinista: el decaimiento del primer tramo depende de la semilla de
  // Math.random, así que se fija para que la aserción no sea intermitente.
  let state = 68;
  const seeded = () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const originalRandom = Math.random;
  Math.random = seeded;
  try {
    for (const options of [{ brightness: 0.92 }, { brightness: 0.35, damping: 0.9945 }]) {
      const wave = pluckWave(44100, 220, 2.2, options);
      assert.equal(wave.length, Math.ceil(44100 * 2.2));
      const peak = Math.max(...Array.from(wave, Math.abs));
      assert.ok(peak <= 0.85 + 1e-6, 'la onda se normaliza a 0.85');
      const quarter = Math.floor(wave.length / 4);
      const first = wave.slice(0, quarter).reduce((s, v) => s + Math.abs(v), 0);
      const last = wave.slice(wave.length - quarter).reduce((s, v) => s + Math.abs(v), 0);
      assert.ok(first > last * 5, 'la cuerda se extingue sola');
    }
  } finally {
    Math.random = originalRandom;
  }
});

test('keyboard synth: noteOn de guitarra o bajo usa un buffer pulsado y no osciladores', async () => {
  const { KeySynth } = require('../keyboard-section.js');
  const oscillators = [];
  const sources = [];
  const parameter = () => ({ setValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
  const ctx = {
    currentTime: 0,
    destination: {},
    sampleRate: 44100,
    resume: async () => {},
    createBuffer: (ch, n) => { const d = new Float32Array(n); return { getChannelData: () => d }; },
    createBufferSource: () => { const s = { connect() {}, start() {}, stop(t) { this.stopTime = t; } }; sources.push(s); return s; },
    createGain: () => ({ gain: parameter(), connect() {} }),
    createOscillator: () => { const o = { type: '', frequency: {}, connect() {}, start() {}, stop() {} }; oscillators.push(o); return o; },
  };
  const synth = new KeySynth({ createContext: () => ctx });
  await synth.noteOn(40, 'guitar');
  await synth.noteOn(29, 'bass');
  assert.equal(synth.voices.size, 2);
  assert.equal(oscillators.length, 0, 'ningún oscilador para instrumentos pulsados');
  assert.equal(sources.length, 2, 'dos buffer source, uno por nota');
  synth.noteOff(40);
  assert.equal(synth.voices.size, 1);
  synth.allOff();
  assert.equal(synth.voices.size, 0);
  assert.ok(sources.every(s => s.stopTime !== undefined));
});

test('keyboard synth: timbre and effects update even before the context starts', () => {
  const synth = new KeySynth({ createContext: () => { throw new Error('Unexpected audio'); } });
  synth.setTimbre('organ');
  synth.setDelay(true);
  synth.setReverb(true);
  synth.setVolume(0.5);
  assert.equal(synth.timbre, 'organ');
  assert.equal(synth.delay, true);
  assert.equal(synth.reverb, true);
  assert.equal(synth.volume, 0.5);
});

test('keyboard synth: setVolume define la ganancia maestra al arrancar y la actualiza en vivo', async () => {
  const parameter = () => ({ value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
  const oscillators = [];
  const ctx = {
    currentTime: 0,
    destination: {},
    sampleRate: 44100,
    resume: async () => {},
    createGain: () => ({ gain: parameter(), connect() {} }),
    createOscillator: () => {
      const osc = { type: '', frequency: { _value: 0, setValueAtTime(v) { this._value = v; } }, connect() {}, start() {}, stop() {} };
      oscillators.push(osc);
      return osc;
    },
  };
  const synth = new KeySynth({ createContext: () => ctx, volume: 0.6 });
  assert.equal(synth.volume, 0.6, 'se guarda el volumen del constructor');
  await synth.noteOn(60);
  assert.equal(synth.master.gain.value, 0.6, 'la ganancia maestra arranca con el volumen elegido');
  synth.setVolume(0.25);
  assert.equal(synth.volume, 0.25);
  assert.equal(synth.master.gain.value, 0.25, 'setVolume actualiza la ganancia en vivo');
  synth.setVolume(0);
  assert.equal(synth.master.gain.value, 0, 'volumen cero apaga la salida sin bloquear las voces');
  synth.allOff();
});

// ---------------------------------------------------------------------------
// QA-SPACE-01 · T-37 · Prueba de integración con el handler real de keydown.
//
// El sandbox levanta keyboard-section.js y panel-controls.js con un DOM falso
// mínimo (el mismo molde de tests/panel-controls.test.cjs): los listeners que
// los módulos registran se pueden disparar, y se modela la activación nativa
// del navegador — un Espacio (o un Enter) sobre un botón enfocado lo activa
// salvo preventDefault, que es justo lo que separa el caso del defecto T-37.
// ---------------------------------------------------------------------------

function keyboardHarness() {
  const registry = new Map();
  function node(id, tagName) {
    if (registry.has(id)) return registry.get(id);
    const el = {
      id, tagName,
      hidden: false, textContent: '', value: '', checked: false, disabled: false, title: '',
      dataset: {}, children: [], listeners: {},
      style: { setProperty() {} },
      _attrs: { 'aria-pressed': 'false', 'aria-label': '' },
      _html: '',
      get innerHTML() { return this._html; },
      set innerHTML(v) { this._html = v; },
      addEventListener(n, f) { (this.listeners[n] = this.listeners[n] || []).push(f); },
      click() { [...(this.listeners.click || [])].forEach(f => f()); },
      getAttribute(n) { return Object.hasOwn(this._attrs, n) ? this._attrs[n] : null; },
      setAttribute(n, v) { this._attrs[n] = String(v); },
      querySelector() { return null; },
      querySelectorAll() { return []; },
    };
    registry.set(id, el);
    return el;
  }

  // Botones de «Acorde en vivo»: «Acorde» arranca activo, como en index.html.
  const liveButtons = ['off', 'note', 'chord'].map(mode => ({
    dataset: { liveMode: mode },
    listeners: {},
    classList: { toggle() {} },
    addEventListener(n, f) { (this.listeners[n] = this.listeners[n] || []).push(f); },
    click() { [...(this.listeners.click || [])].forEach(f => f()); },
    _pressed: mode === 'chord' ? 'true' : 'false',
    getAttribute(n) { return n === 'aria-pressed' ? this._pressed : null; },
    setAttribute(n, v) { if (n === 'aria-pressed') this._pressed = String(v); },
  }));

  // Contexto de audio falso, completo para timbre piano y guitarra (el molde
  // ya probado en las pruebas del sintetizador): sin él, noteOn rechazaría sin
  // .catch y el sandbox caería en un rechazo no atendido.
  const gainParam = () => ({ value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
  const audioCtx = {
    currentTime: 0, sampleRate: 44100, destination: {},
    resume: async () => {},
    createGain: () => ({ gain: gainParam(), connect() {}, disconnect() {} }),
    createOscillator: () => ({ type: '', frequency: { setValueAtTime() {} }, connect() {}, start() {}, stop() {} }),
    createBuffer: (canales, muestras) => ({ getChannelData: () => new Float32Array(muestras) }),
    createBufferSource: () => ({ connect() {}, start() {}, stop() {} }),
  };

  const known = {
    'keyboard-section': 'DIV',
    'keyboard-keys': 'DIV',
    'keyboard-live-chord': 'DIV',
    'quick-play': 'BUTTON',
    'quick-midi-time': 'SPAN',
    'progression-transport': 'DIV',
    'midi-transport': 'DIV',
    'player-status': 'DIV',
    'player-toggle': 'BUTTON',
    'midi-play': 'BUTTON',
    'metronome-toggle': 'BUTTON',
    'midi-time': 'SPAN',
    'midi-file': 'INPUT',
  };
  const docListeners = {};
  const documentStub = {
    getElementById: id => (Object.hasOwn(known, id) ? node(id, known[id]) : null),
    addEventListener(n, f) { (docListeners[n] = docListeners[n] || []).push(f); },
    querySelector() { return null; },
    querySelectorAll(sel) {
      if (sel === '[data-source]' || sel === '[data-card-mode]' || sel === 'details' || sel === '[data-section-name]') return [];
      return [];
    },
  };
  const liveRoot = node('keyboard-live-chord', 'DIV');
  liveRoot.querySelectorAll = sel => (sel === '[data-live-mode]' ? liveButtons : []);
  // La sección en modo «Mástil» (panel oculto), como la usa el autor cuando
  // captura: el mástil está visible y el teclado reconoce el acorde en vivo.
  node('keyboard-section', 'DIV').hidden = true;

  const win = {
    listeners: {},
    addEventListener(n, f) { (this.listeners[n] = this.listeners[n] || []).push(f); },
    dispatchEvent() {},
  };
  win.AudioContext = function () { return audioCtx; };

  // Estado de la app que el atajo consulta o cambia. Las tarjetas sumadas se
  // cuentan por la progresión (acorde en vivo) y por los llamados hechos al
  // addProgressionChord del acorde seleccionado (captura de micrófono).
  const progression = [];
  let selectedAdds = 0;
  let playToggled = 0;
  const context = vm.createContext({
    window: win,
    document: documentStub,
    MutationObserver: class { constructor(cb) { this.cb = cb; } observe() {} },
    Event: class { constructor(tipo) { this.type = tipo; } },
    progression,
    draggingProgressionItem: false,
    instrument: 'guitar',
    chordType: { value: 'maj' },
    selectedMode: 'ionian',
    notes: ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'],
    noteName: pitch => 'nota-' + pitch,
    saveCustomProgression: () => {},
    addProgressionChord: () => { selectedAdds++; return true; },
  });

  // El Play de prueba del transporte, antes de cargar panel-controls.js, para
  // que el clic reenviado por #quick-play llegue a los dos listeners del
  // player-toggle real: el nuestro (marca el estado) y el de elegir la fuente.
  node('player-toggle', 'BUTTON').addEventListener('click', () => {
    playToggled++;
    node('player-toggle', 'BUTTON').setAttribute('aria-pressed', String(playToggled % 2 === 1));
  });

  vm.runInContext(fs.readFileSync(path.join(__dirname, '../keyboard-section.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../panel-controls.js'), 'utf8'), context);

  function fireKeydown(spec) {
    const event = {
      code: spec.code, key: spec.key === undefined ? spec.code : spec.key,
      repeat: Boolean(spec.repeat),
      altKey: Boolean(spec.altKey), ctrlKey: Boolean(spec.ctrlKey), metaKey: Boolean(spec.metaKey),
      target: spec.target,
      defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; },
      stopPropagation() { this.propagationStopped = true; },
    };
    [...(win.listeners.keydown || [])].forEach(fn => fn(event));
    // Activación nativa del navegador: sobre un botón enfocado, el Espacio (en
    // el keyup) y el Enter (en el keydown) disparan el click si ningún keydown
    // los prevenió. Con modificadores el navegador no activa el botón.
    if (!event.defaultPrevented && !event.altKey && !event.ctrlKey && !event.metaKey
      && spec.target && spec.target.tagName === 'BUTTON'
      && (event.code === 'Space' || event.code === 'Enter' || event.code === 'NumpadEnter')) {
      spec.target.click();
    }
    return event;
  }

  function fireKeyup(spec) {
    const event = { code: spec.code, key: spec.key === undefined ? spec.code : spec.key, target: spec.target };
    [...(win.listeners.keyup || [])].forEach(fn => fn(event));
  }

  return {
    win, liveButtons, progression,
    el: node, keydown: fireKeydown, keyup: fireKeyup,
    playToggled: () => playToggled,
    selectedAdds: () => selectedAdds,
  };
}

// Aceptación 2 (QA-SPACE-01): teclado en vivo + foco en #quick-play.
test('teclado: con captura del teclado activa, Espacio sobre #quick-play agrega una tarjeta y no activa Play', () => {
  const h = keyboardHarness();
  h.liveButtons[1].click(); // captura del teclado en fase Nota
  h.keydown({ code: 'KeyA', key: 'a', target: h.el('quick-play') }); // una nota: el acorde reconocido es Do mayor
  assert.equal(h.progression.length, 0, 'todavía no se agregó nada');
  const press = h.keydown({ code: 'Space', key: ' ', target: h.el('quick-play') });
  assert.equal(h.progression.length, 1, 'una pulsación suma exactamente una tarjeta');
  assert.equal(h.el('player-toggle').getAttribute('aria-pressed'), 'false', 'aria-pressed del transporte no cambia');
  assert.equal(h.playToggled(), 0, 'el transporte no se activó ni pausó');
  assert.equal(press.defaultPrevented, true, 'la tecla quedó en el atajo: no llegó al botón');
});

// El mismo desvío con la captura de micrófono (la otra sesión del repro).
test('teclado: con la captura del micrófono activa, Espacio sobre #quick-play agrega el acorde seleccionado', () => {
  const h = keyboardHarness();
  h.liveButtons[0].click(); // «Acorde en vivo» del teclado apagado
  h.win.__microLiveActive = () => true; // el micrófono siguiendo la escala en vivo
  assert.equal(h.el('player-toggle').getAttribute('aria-pressed'), 'false');
  const press = h.keydown({ code: 'Space', key: ' ', target: h.el('quick-play') });
  assert.equal(h.selectedAdds(), 1, 'agrega el mismo acorde que se agrega con el foco fuera del transporte');
  assert.equal(h.progression.length, 0, 'no hay acorde en vivo del teclado que sumar');
  assert.equal(h.el('player-toggle').getAttribute('aria-pressed'), 'false', 'el transporte no cambia de estado');
  assert.equal(press.defaultPrevented, true);
});

// Aceptación 3: sin sesión de captura activa, la semántica nativa sigue igual.
test('teclado: sin captura en vivo, Espacio sobre #quick-play sigue activando el transporte', () => {
  const h = keyboardHarness();
  h.liveButtons[0].click(); // captura apagada (y sin micrófono)
  const press = h.keydown({ code: 'Space', key: ' ', target: h.el('quick-play') });
  assert.equal(press.defaultPrevented, false, 'el transporte se queda la tecla, igual que siempre');
  assert.equal(h.el('player-toggle').getAttribute('aria-pressed'), 'true', 'Play se activa con el Espacio nativo');
  assert.equal(h.playToggled(), 1);
  assert.equal(h.progression.length, 0, 'sin captura no se agrega tarjeta');
});

// Aceptación 4: Enter sigue perteneciendo al botón enfocado, con o sin captura.
test('teclado: Enter sobre el transporte sigue siendo del botón enfocado aunque haya captura', () => {
  const h = keyboardHarness();
  h.liveButtons[1].click();
  const press = h.keydown({ code: 'Enter', key: 'Enter', target: h.el('quick-play') });
  assert.equal(press.defaultPrevented, false, 'el botón foco conserva su Enter');
  assert.equal(h.el('player-toggle').getAttribute('aria-pressed'), 'true', 'el transporte se activa con Enter');
  assert.equal(h.progression.length, 0, 'Enter no agrega tarjeta con el foco en el transporte');
});

// Aceptación 4: event.repeat no apila tarjetas ni deja escapar la tecla.
test('teclado: la repetición automática de Espacio no apila tarjetas y no escapa del atajo', () => {
  const h = keyboardHarness();
  h.liveButtons[1].click();
  h.keydown({ code: 'KeyA', key: 'a', target: h.el('quick-play') });
  h.keydown({ code: 'Space', key: ' ', target: h.el('quick-play') });
  const repeat = h.keydown({ code: 'Space', key: ' ', target: h.el('quick-play'), repeat: true });
  assert.equal(h.progression.length, 1, 'una sola pulsación, una sola tarjeta aunque se mantenga la tecla');
  assert.equal(repeat.defaultPrevented, true, 'el Espacio mantenido no llega al botón');
  const repeatFuera = h.keydown({ code: 'Space', key: ' ', target: {}, repeat: true });
  assert.equal(repeatFuera.defaultPrevented, true, 'también fuera del transporte: sin preventDefault el Espacio mantenido haría scroll');
  assert.equal(h.progression.length, 1);
});

// Aceptación 4: campos y modificadores conservan su semántica.
test('teclado: un campo de texto y las teclas con modificadores no agregan nada ni cambian el transporte', () => {
  const h = keyboardHarness();
  h.liveButtons[1].click();
  const campo = { tagName: 'INPUT', type: 'text', isContentEditable: false };
  const enCampo = h.keydown({ code: 'Space', key: ' ', target: campo });
  assert.equal(enCampo.defaultPrevented, false, 'un campo de texto escribe el espacio');
  assert.equal(h.progression.length, 0, 'un campo no agrega acordes');
  const conAlt = h.keydown({ code: 'Space', key: ' ', target: h.el('quick-play'), altKey: true });
  assert.equal(conAlt.defaultPrevented, false, 'Alt+Espacio sigue siendo del navegador');
  assert.equal(h.selectedAdds(), 0, 'los modificadores apartan el atajo');
  assert.equal(h.progression.length, 0, 'los modificadores no agregan tarjetas');
});