const assert = require('node:assert/strict');
const test = require('node:test');

const {
  connectedNodeIds,
  createClassDiff,
  linkTouchesNode,
  neighborhoodFromIndex,
} = require('../graph-highlight.js');

test('detects connected links by endpoints instead of link id', () => {
  const links = [
    { id: 'same', source: 'A', target: 'B' },
    { id: 'same', source: 'C', target: 'D' },
    { source: 'E', target: 'F' },
  ];

  assert.equal(linkTouchesNode(links[0], 'A'), true);
  assert.equal(linkTouchesNode(links[1], 'A'), false);
  assert.equal(linkTouchesNode(links[2], 'A'), false);
});

test('collects only nodes adjacent to the selected node', () => {
  const ids = connectedNodeIds([
    { id: 'L1', source: { id: 'A' }, target: { id: 'B' } },
    { id: 'L2', source: { id: 'C' }, target: { id: 'D' } },
    { id: 'L3', source: 'B', target: 'E' },
  ], 'A');

  assert.deepEqual([...ids].sort(), ['A', 'B']);
});

test('collects neighborhood from an existing graph index without scanning all links', () => {
  const links = [
    { id: 'L1', source: { id: 'N1' }, target: { id: 'N2' } },
    { id: 'L2', source: { id: 'N3' }, target: { id: 'N1' } },
  ];
  const index = {
    linksByNodeId: new Map([['N1', links]]),
  };

  const result = neighborhoodFromIndex(index, 'N1');

  assert.deepEqual([...result.nodeIds].sort(), ['N1', 'N2', 'N3']);
  assert.deepEqual([...result.linkIds].sort(), ['L1', 'L2']);
});

test('computes class diff updates from previous and next id sets', () => {
  const diff = createClassDiff(new Set(['N1', 'N2']), new Set(['N2', 'N3']));

  assert.deepEqual(diff.add, ['N3']);
  assert.deepEqual(diff.remove, ['N1']);
  assert.deepEqual(diff.keep, ['N2']);
});
