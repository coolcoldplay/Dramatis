const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createRenderScheduler,
} = require('../render-scheduler.js');

test('coalesces repeated layout requests into one frame callback', () => {
  const callbacks = [];
  const scheduler = createRenderScheduler({
    requestFrame: (fn) => {
      callbacks.push(fn);
      return callbacks.length;
    },
  });

  let flushes = 0;
  scheduler.requestLayout(() => { flushes += 1; });
  scheduler.requestLayout(() => { flushes += 1; });
  scheduler.requestLayout(() => { flushes += 1; });

  assert.equal(callbacks.length, 1);
  assert.equal(flushes, 0);

  callbacks[0](100);
  assert.equal(flushes, 1);
});

test('schedules a new frame when a request arrives during a flush', () => {
  const callbacks = [];
  const scheduler = createRenderScheduler({
    requestFrame: (fn) => {
      callbacks.push(fn);
      return callbacks.length;
    },
  });

  let flushes = 0;
  scheduler.requestLayout(() => {
    flushes += 1;
    scheduler.requestLayout(() => { flushes += 1; });
  });

  callbacks[0](100);
  assert.equal(flushes, 1);
  assert.equal(callbacks.length, 2);

  callbacks[1](116);
  assert.equal(flushes, 2);
});

