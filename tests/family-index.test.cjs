const assert = require('node:assert/strict');
const test = require('node:test');

const FamilyIndex = require('../src/family/family-index.js');

function fixture() {
  return {
    nodes: [
      { id: 'P1', name: 'Jose Arcadio', aliases: ['The Founder'], notes: 'Buendia patriarch' },
      { id: 'P2', name: 'Ursula Iguaran' },
      { id: 'C', name: 'Aureliano Buendia', aliases: ['Colonel Aureliano Buendia'], notes: 'Thirty-two uprisings' },
      { id: 'S', name: 'Remedios Moscote' },
      { id: 'X', name: 'Arya Stark' },
      { id: 'Y', name: 'Sansa Stark' },
    ],
    relations: [
      { id: 'U1', kind: 'union', participants: [{ nodeId: 'P1', role: 'partner' }, { nodeId: 'P2', role: 'partner' }] },
      { id: 'R1', kind: 'parentage', participants: [{ nodeId: 'P1', role: 'parent' }, { nodeId: 'P2', role: 'parent' }, { nodeId: 'C', role: 'child' }] },
      { id: 'U2', kind: 'union', participants: [{ nodeId: 'C', role: 'partner' }, { nodeId: 'S', role: 'partner' }] },
      { id: 'K1', kind: 'kinship', participants: [{ nodeId: 'X', role: 'member' }, { nodeId: 'Y', role: 'member' }] },
    ],
  };
}

test('builds ancestry, union, component, and neighborhood indices in one pass', () => {
  const { nodes, relations } = fixture();
  const index = FamilyIndex.buildFamilyIndex(Object.freeze(nodes), Object.freeze(relations));

  assert.deepEqual([...index.parentsByChild.get('C')], ['P1', 'P2']);
  assert.deepEqual([...index.childrenByParent.get('P1')], ['C']);
  assert.deepEqual([...index.unionsByNode.get('C')], ['U2']);
  assert.deepEqual([...index.ancestorsOf('C')].sort(), ['P1', 'P2']);
  assert.deepEqual([...index.descendantsOf('P1')], ['C']);
  assert.deepEqual([...index.neighborhoodOf('C', 1)].sort(), ['C', 'P1', 'P2', 'S']);
  assert.equal(index.components.length, 2);
  assert.deepEqual(index.components.map((component) => component.length).sort((a, b) => a - b), [2, 4]);
});

test('separates exact-field search from fuzzy metadata search', () => {
  const { nodes, relations } = fixture();
  const index = FamilyIndex.buildFamilyIndex(nodes, relations, {
    tagsByNode: new Map([['C', ['Liberal', 'Buendia']]]),
  });

  assert.deepEqual(index.searchExact('aureliano').map((node) => node.id), ['C']);
  assert.deepEqual(index.searchExact('founder').map((node) => node.id), ['P1']);
  assert.deepEqual(index.searchExact('uprisings'), []);
  assert.deepEqual(index.searchFuzzy('uprisings').map((node) => node.id), ['C']);
  assert.deepEqual(index.searchFuzzy('liberal').map((node) => node.id), ['C']);
});

test('does not depend on Array.find while building dense lookup structures', () => {
  const { nodes, relations } = fixture();
  const originalFind = Array.prototype.find;
  Array.prototype.find = function() { throw new Error('Array.find is not allowed in index construction'); };
  try {
    const index = FamilyIndex.buildFamilyIndex(nodes, relations);
    assert.equal(index.nodeById.get('C').name, 'Aureliano Buendia');
  } finally {
    Array.prototype.find = originalFind;
  }
});
