const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildTopologyMetrics,
  calculateNodeRadius,
  nodeRadiusMap,
  normalizeTopologySizing,
} = require('../topology-sizing.js');

const nodes = [
  { id: 'N1' },
  { id: 'N2' },
  { id: 'N3' },
  { id: 'N4' },
];

const links = [
  { id: 'L1', source: 'N1', target: 'N2' },
  { id: 'L2', source: 'N1', target: 'N3' },
  { id: 'L3', source: 'N2', target: 'N3' },
  { id: 'L4', source: 'N3', target: 'N4', hidden: true },
];

test('builds degree and connected-component metrics from visible links', () => {
  const metrics = buildTopologyMetrics(nodes, links);

  assert.deepEqual(Object.fromEntries(metrics.degree), { N1: 2, N2: 2, N3: 2, N4: 0 });
  assert.deepEqual(Object.fromEntries(metrics.connectivity), { N1: 3, N2: 3, N3: 3, N4: 1 });
});

test('keeps fixed radius when topology sizing is disabled', () => {
  const radius = calculateNodeRadius('N1', buildTopologyMetrics(nodes, links), {
    mode: 'none',
    baseRadius: 31,
    strength: 1,
  });

  assert.equal(radius, 31);
});

test('scales radius by degree and connectivity metrics', () => {
  const metrics = buildTopologyMetrics(nodes, links);
  const degreeRadii = nodeRadiusMap(nodes, metrics, { mode: 'degree', baseRadius: 31, strength: 1 });
  const connectivityRadii = nodeRadiusMap(nodes, metrics, { mode: 'connectivity', baseRadius: 31, strength: 1 });

  assert.ok(degreeRadii.get('N1') > degreeRadii.get('N4'));
  assert.ok(connectivityRadii.get('N1') > connectivityRadii.get('N4'));
  assert.equal(degreeRadii.get('N1'), degreeRadii.get('N2'));
});

test('uses high contrast sizing at full strength', () => {
  const metrics = buildTopologyMetrics(nodes, links);
  const radii = nodeRadiusMap(nodes, metrics, { mode: 'degree', baseRadius: 31, strength: 1 });

  assert.ok(radii.get('N1') / radii.get('N4') >= 3.2);
});

test('normalizes topology sizing options', () => {
  assert.deepEqual(normalizeTopologySizing({ mode: 'degree', strength: 2 }), {
    mode: 'degree',
    strength: 1,
  });
  assert.deepEqual(normalizeTopologySizing({ mode: 'bad', strength: -1 }), {
    mode: 'none',
    strength: 0,
  });
});
