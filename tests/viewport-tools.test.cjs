const assert = require('node:assert/strict');
const test = require('node:test');

const {
  clampNodesToViewport,
  viewportBounds,
} = require('../viewport-tools.js');

test('calculates current graph-space bounds from zoom transform and screen padding', () => {
  const bounds = viewportBounds(
    { x: -100, y: -50, k: 2 },
    { width: 500, height: 300 },
    20
  );

  assert.deepEqual(bounds, {
    minX: 60,
    maxX: 290,
    minY: 35,
    maxY: 165,
  });
});

test('clamps node x/y and fixes nodes inside the current viewport', () => {
  const nodes = [
    { id: 'N1', x: -100, y: 50 },
    { id: 'N2', x: 160, y: 240, fx: 160, fy: 240 },
    { id: 'N3', x: 90, y: 90 },
  ];

  const changed = clampNodesToViewport(
    nodes,
    { x: 0, y: 0, k: 1 },
    { width: 200, height: 200 },
    20
  );

  assert.equal(changed, 2);
  assert.deepEqual(nodes, [
    { id: 'N1', x: 20, y: 50, fx: 20, fy: 50 },
    { id: 'N2', x: 160, y: 180, fx: 160, fy: 180 },
    { id: 'N3', x: 90, y: 90, fx: 90, fy: 90 },
  ]);
});
