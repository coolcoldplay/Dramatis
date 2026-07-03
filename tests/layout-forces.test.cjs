const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildClusterTargets,
  createBoundaryForce,
  createClusterForce,
  distributeClusterCenters,
  pullNodesInsideBounds,
} = require('../layout-forces.js');

test('pulls nodes into viewport interior and clears fixed positions', () => {
  const nodes = [
    { id: 'N1', x: -200, y: 50, fx: -200, fy: 50 },
    { id: 'N2', x: 400, y: 500 },
    { id: 'N3', x: 120, y: 130, fx: 120, fy: 130 },
  ];

  const changed = pullNodesInsideBounds(nodes, {
    minX: 0,
    maxX: 300,
    minY: 0,
    maxY: 300,
  }, 40);

  assert.equal(changed, 2);
  assert.deepEqual(nodes.map(n => [n.x, n.y, n.fx, n.fy]), [
    [40, 50, null, null],
    [260, 260, null, null],
    [120, 130, 120, 130],
  ]);
});

test('boundary force pushes nodes away from viewport edges', () => {
  const nodes = [
    { id: 'N1', x: 5, y: 150, vx: 0, vy: 0 },
    { id: 'N2', x: 295, y: 150, vx: 0, vy: 0 },
    { id: 'N3', x: 150, y: 10, vx: 0, vy: 0 },
  ];
  const force = createBoundaryForce(() => ({
    minX: 0,
    maxX: 300,
    minY: 0,
    maxY: 300,
  }), { margin: 40, strength: 0.2 });

  force.initialize(nodes);
  force(1);

  assert.ok(nodes[0].vx > 0);
  assert.ok(nodes[1].vx < 0);
  assert.ok(nodes[2].vy > 0);
});

test('distributes cluster centers around the visible canvas', () => {
  const centers = distributeClusterCenters(['A', 'B', 'C'], {
    minX: 0,
    maxX: 600,
    minY: 0,
    maxY: 400,
  });

  assert.equal(centers.size, 3);
  assert.ok(centers.get('A').x >= 80);
  assert.ok(centers.get('A').x <= 520);
  assert.ok(centers.get('A').y >= 80);
  assert.ok(centers.get('A').y <= 320);
});

test('assigns nodes to tag cluster targets with an untagged fallback', () => {
  const category = {
    id: 'C2',
    tags: [
      { id: 'T1', name: 'Case' },
      { id: 'T2', name: 'Town' },
    ],
  };
  const nodes = [
    { id: 'N1', tags: { C2: 'T1' } },
    { id: 'N2', tags: { C2: 'T2' } },
    { id: 'N3', tags: {} },
  ];

  const targets = buildClusterTargets(nodes, category, {
    minX: 0,
    maxX: 600,
    minY: 0,
    maxY: 400,
  });

  assert.equal(targets.nodeTargets.get('N1').label, 'Case');
  assert.equal(targets.nodeTargets.get('N2').label, 'Town');
  assert.equal(targets.nodeTargets.get('N3').label, '\u672a\u5206\u7c7b');
  assert.equal(targets.clusterCenters.size, 3);
});

test('cluster force pulls node velocity toward assigned center', () => {
  const nodes = [{ id: 'N1', x: 0, y: 0, vx: 0, vy: 0 }];
  const targets = new Map([
    ['N1', { x: 100, y: 50, label: 'A' }],
  ]);
  const force = createClusterForce(targets, { strength: 0.1 });

  force.initialize(nodes);
  force(1);

  assert.ok(nodes[0].vx > 0);
  assert.ok(nodes[0].vy > 0);
});
