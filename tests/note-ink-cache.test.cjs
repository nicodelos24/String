const { test } = require('node:test');
const assert = require('node:assert/strict');
const noteInk = require('../note-ink.js');

function measurePow(callback) {
  const originalPow = Math.pow;
  let calls = 0;
  Math.pow = (...args) => {
    calls++;
    return originalPow(...args);
  };
  try {
    return { value: callback(), calls };
  } finally {
    Math.pow = originalPow;
  }
}

test('note-ink reutiliza el cálculo por relleno y opción soft sin cambiar la tinta', () => {
  const softCold = measurePow(() => noteInk.inkOverFill('#e53935', { soft: true }));
  const softHot = measurePow(() => noteInk.inkOverFill('#e53935', { soft: true }));
  assert.ok(softCold.calls > 0);
  assert.equal(softHot.calls, 0);
  assert.equal(softHot.value, softCold.value);

  const regularCold = measurePow(() => noteInk.inkOverFill('#e53935'));
  const regularHot = measurePow(() => noteInk.inkOverFill('#e53935', { soft: false }));
  assert.ok(regularCold.calls > 0);
  assert.equal(regularHot.calls, 0);
  assert.equal(regularHot.value, regularCold.value);
  assert.notEqual(regularHot.value, softHot.value);

  const otherFillCold = measurePow(() => noteInk.inkOverFill('#4caf50', { soft: true }));
  const otherFillHot = measurePow(() => noteInk.inkOverFill('#4caf50', { soft: true }));
  assert.ok(otherFillCold.calls > 0);
  assert.equal(otherFillHot.calls, 0);
  assert.equal(otherFillHot.value, otherFillCold.value);
  assert.notEqual(otherFillHot.value, softHot.value);
});
