const assert = require('node:assert/strict');
const test = require('node:test');

const View = require('../src/family/family-view.js');
const FamilyIndex = require('../src/family/family-index.js');

test('selection changes highlight state without invalidating layout', () => {
  let state = View.createFamilyViewState();
  state = View.reduceFamilyView(state, { type: 'SELECT_NODE', nodeId: 'N1' });

  assert.equal(state.selectedNodeId, 'N1');
  assert.equal(state.selectedRelationId, null);
  assert.equal(state.layoutRevision, 0);
});

test('structural filters, focus, and spacing invalidate layout', () => {
  let state = View.createFamilyViewState();
  state = View.reduceFamilyView(state, { type: 'SET_FILTER', key: 'certainty', value: ['confirmed'] });
  state = View.reduceFamilyView(state, { type: 'SET_SPACING', key: 'generationGap', value: 180 });
  state = View.reduceFamilyView(state, { type: 'SET_FOCUS', nodeId: 'N1', depth: 2 });

  assert.deepEqual(state.filters.certainty, ['confirmed']);
  assert.equal(state.generationGap, 180);
  assert.equal(state.focusNodeId, 'N1');
  assert.equal(state.focusDepth, 2);
  assert.equal(state.layoutRevision, 3);
});

test('search changes do not invalidate layout', () => {
  let state = View.createFamilyViewState();
  state = View.reduceFamilyView(state, { type: 'SET_SEARCH', query: 'Arya', fuzzy: true });

  assert.equal(state.searchQuery, 'Arya');
  assert.equal(state.searchFuzzy, true);
  assert.equal(state.layoutRevision, 0);
});

test('exact family search only uses names and aliases', () => {
  const nodes = [
    { id: 'N1', name: 'Arya Stark', notes: 'No one' },
    { id: 'N2', name: 'Jaqen Hghar', notes: 'Trains Arya' },
  ];
  const index = FamilyIndex.buildFamilyIndex(nodes, []);

  assert.deepEqual(View.exactFamilySearch(index, 'Arya').map((node) => node.id), ['N1']);
  assert.deepEqual(View.fuzzyFamilySearch(index, 'Arya').map((node) => node.id), ['N1', 'N2']);
});

test('stale layout requests cannot replace a newer request', async () => {
  const gate = View.createLayoutRequestGate();
  const first = gate.begin();
  const second = gate.begin();

  assert.equal(gate.isCurrent(first), false);
  assert.equal(gate.isCurrent(second), true);
  gate.cancel();
  assert.equal(gate.isCurrent(second), false);
});
