const assert = require('node:assert/strict');
const test = require('node:test');

const {
  clampNodesToViewport,
  seedMissingNodePositions,
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

test('seeds missing node positions around the current viewport center', () => {
  const nodes = Array.from({ length: 20 }, (_, index) => ({ id: `N${index + 1}` }));

  const changed = seedMissingNodePositions(
    nodes,
    { x: 0, y: 0, k: 1 },
    { width: 500, height: 300 },
    { padding: 50 }
  );

  assert.equal(changed, 20);
  nodes.forEach(node => {
    assert.equal(Number.isFinite(node.x), true);
    assert.equal(Number.isFinite(node.y), true);
    assert.equal(node.x >= 50 && node.x <= 450, true);
    assert.equal(node.y >= 50 && node.y <= 250, true);
    assert.equal(node.vx, 0);
    assert.equal(node.vy, 0);
    assert.equal(node.fx, undefined);
    assert.equal(node.fy, undefined);
  });
});

test('does not overwrite nodes that already have saved positions', () => {
  const nodes = [
    { id: 'N1', x: 80, y: 90 },
    { id: 'N2', fx: 130, fy: 140 },
    { id: 'N3' },
  ];

  const changed = seedMissingNodePositions(
    nodes,
    { x: 0, y: 0, k: 1 },
    { width: 300, height: 300 },
    { padding: 30 }
  );

  assert.equal(changed, 1);
  assert.deepEqual(nodes[0], { id: 'N1', x: 80, y: 90 });
  assert.deepEqual(nodes[1], { id: 'N2', fx: 130, fy: 140 });
  assert.equal(Number.isFinite(nodes[2].x), true);
  assert.equal(Number.isFinite(nodes[2].y), true);
});
