const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createInitialState,
  normalizeGraphStyle,
  normalizeNodeLabelPlacement,
} = require('../src/app-state.js');

test('creates the default graph editing state', () => {
  const state = createInitialState();

  assert.deepEqual(state.nodes, []);
  assert.deepEqual(state.links, []);
  assert.deepEqual(state.tagCategories, []);
  assert.equal(state.mode, 'organize');
  assert.equal(state.graphIndex, null);
  assert.equal(state.linkTypes.relation.label, '\u5173\u7cfb');
  assert.equal(state.linkTypes.action.label, '\u884c\u52a8');
  assert.equal(state.forceConfig.linkDistance, 170);
});

test('normalizes graph style defaults', () => {
  assert.deepEqual(normalizeGraphStyle({}), {
    nodeLabelColor: '#e8e4d6',
    nodeLabelFontSize: 13,
    nodeScale: 1,
    nodeLabelOpacity: 1,
    nodeLabelPlacement: 'outside',
  });

  assert.equal(normalizeGraphStyle({ nodeLabelPlacement: 'inside' }).nodeLabelPlacement, 'inside');
});

test('normalizes node label placement', () => {
  assert.equal(normalizeNodeLabelPlacement('inside'), 'inside');
  assert.equal(normalizeNodeLabelPlacement('below'), 'outside');
});
