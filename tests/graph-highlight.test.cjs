const assert = require('node:assert/strict');
const test = require('node:test');

const {
  connectedNodeIds,
  linkTouchesNode,
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
