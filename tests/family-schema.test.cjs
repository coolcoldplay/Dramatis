const assert = require('node:assert/strict');
const test = require('node:test');

const FamilySchema = require('../src/family/family-schema.js');

test('migrates each legacy family link without inventing relations', () => {
  const result = FamilySchema.normalizeFamilyGraph({
    links: [
      { id: 'L1', source: 'N1', target: 'N2', familyRelation: 'spouse', label: 'married' },
      { id: 'L2', source: 'N1', target: 'N3', familyRelation: 'parent' },
      { id: 'L3', source: 'N4', target: 'N3', familyRelation: 'sibling' },
      { id: 'L4', source: 'N5', target: 'N6', familyRelation: 'child' },
    ],
  });

  assert.equal(result.familyRelations.length, 4);
  assert.deepEqual(result.familyRelations.map((relation) => relation.kind), [
    'union', 'parentage', 'kinship', 'parentage',
  ]);
  assert.deepEqual(result.familyRelations[1].participants, [
    { nodeId: 'N1', role: 'parent' },
    { nodeId: 'N3', role: 'child' },
  ]);
  assert.deepEqual(result.familyRelations[3].participants, [
    { nodeId: 'N6', role: 'parent' },
    { nodeId: 'N5', role: 'child' },
  ]);
  assert.equal(result.familyRelations.some((relation) => relation.inferred), false);
  assert.equal(result.migratedLegacy, true);
});

test('uses non-empty v5 familyRelations as the authority', () => {
  const result = FamilySchema.normalizeFamilyGraph({
    links: [{ id: 'L1', source: 'N1', target: 'N2', familyRelation: 'spouse' }],
    familyRelations: [{
      id: 'F9',
      kind: 'union',
      subtype: 'political_union',
      participants: [
        { nodeId: 'N1', role: 'partner' },
        { nodeId: 'N3', role: 'partner' },
      ],
      certainty: 'confirmed',
    }],
  });

  assert.equal(result.familyRelations.length, 1);
  assert.equal(result.familyRelations[0].id, 'F9');
  assert.equal(result.familyRelations[0].subtype, 'political_union');
  assert.equal(result.migratedLegacy, false);
});

test('preserves unknown open enum values and malformed participants for diagnostics', () => {
  const relation = FamilySchema.normalizeFamilyRelation({
    id: 'F1',
    kind: 'ritual_bond',
    subtype: 'blood_oath',
    status: 'sealed',
    participants: [{ nodeId: 'N1', role: 'witness' }, { role: 'missing_person' }],
  }, 0);

  assert.equal(relation.kind, 'ritual_bond');
  assert.equal(relation.subtype, 'blood_oath');
  assert.equal(relation.status, 'sealed');
  assert.equal(relation.participants.length, 2);
  assert.equal(relation.participants[1].nodeId, '');
});

test('normalizes family view defaults and clamps spacing', () => {
  assert.deepEqual(FamilySchema.normalizeFamilyView({ generationGap: 9999 }), {
    layoutMode: 'lineage',
    houseTagCategoryId: null,
    generationGap: 260,
    branchGap: 48,
    componentGap: 120,
    collapsedNodeIds: [],
  });

  assert.deepEqual(FamilySchema.normalizeFamilyView({
    layoutMode: 'house',
    houseTagCategoryId: 'C3',
    branchGap: 1,
    componentGap: 999,
    collapsedNodeIds: ['N2', 'N2', null, 'N3'],
  }), {
    layoutMode: 'house',
    houseTagCategoryId: 'C3',
    generationGap: 150,
    branchGap: 24,
    componentGap: 260,
    collapsedNodeIds: ['N2', 'N3'],
  });
});

test('reports compatibility losses instead of silently flattening metadata', () => {
  const result = FamilySchema.exportLegacyFamilyRelations([{ id: 'N1' }, { id: 'N2' }, { id: 'N3' }], [{
    id: 'F1',
    kind: 'union',
    subtype: 'partnership',
    participants: [
      { nodeId: 'N1', role: 'partner' },
      { nodeId: 'N2', role: 'partner' },
      { nodeId: 'N3', role: 'partner' },
    ],
    certainty: 'disputed',
    time: { start: { year: 2000 } },
  }]);

  assert.equal(result.links.length, 0);
  assert.equal(result.losses.some((loss) => loss.code === 'MULTI_PARTICIPANT_UNION'), true);
  assert.equal(result.losses.some((loss) => loss.code === 'RELATION_METADATA'), true);
});
