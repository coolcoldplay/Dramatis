const assert = require('node:assert/strict');
const test = require('node:test');

const {
  calculateNodeDegrees,
  getNodesMatchingDegree,
  matchesOperator,
} = require('../degree-filter.js');

test('calculates node degree from non-hidden links with object or string endpoints', () => {
  const nodes = [{ id: 'N1' }, { id: 'N2' }, { id: 'N3' }, { id: 'N4' }];
  const links = [
    { source: 'N1', target: 'N2' },
    { source: { id: 'N1' }, target: { id: 'N3' } },
    { source: 'N2', target: 'N3', hidden: true },
    { source: 'N3', target: 'N999' },
  ];

  const degrees = calculateNodeDegrees(nodes, links);

  assert.deepEqual(Object.fromEntries(degrees), {
    N1: 2,
    N2: 1,
    N3: 1,
    N4: 0,
  });
});

test('matches nodes by degree operator', () => {
  const nodes = [
    { id: 'N1', name: 'Hub' },
    { id: 'N2', name: 'Leaf' },
    { id: 'N3', name: 'Bridge' },
    { id: 'N4', name: 'Isolate' },
  ];
  const links = [
    { source: 'N1', target: 'N2' },
    { source: 'N1', target: 'N3' },
    { source: 'N3', target: 'N4' },
  ];

  assert.deepEqual(getNodesMatchingDegree(nodes, links, '<=', 1).map(n => n.id), ['N2', 'N4']);
  assert.deepEqual(getNodesMatchingDegree(nodes, links, '=', 2).map(n => n.id), ['N1', 'N3']);
  assert.deepEqual(getNodesMatchingDegree(nodes, links, '>=', 2).map(n => n.id), ['N1', 'N3']);
});

test('exposes degree operator matching for indexed UI filters', () => {
  assert.equal(matchesOperator(1, '<=', 1), true);
  assert.equal(matchesOperator(2, '<=', 1), false);
  assert.equal(matchesOperator(2, '=', 2), true);
  assert.equal(matchesOperator(3, '>=', 2), true);
});
