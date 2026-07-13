const assert = require('node:assert/strict');
const test = require('node:test');

const Editor = require('../src/family/family-editor.js');

test('exposes kind-specific roles, subtypes, and statuses', () => {
  assert.deepEqual(Editor.allowedRoles('parentage'), ['parent', 'child']);
  assert.equal(Editor.allowedSubtypes('union').includes('political_union'), true);
  assert.equal(Editor.allowedSubtypes('parentage').includes('supernatural'), true);
  assert.equal(Editor.allowedStatuses('union').includes('annulled'), true);
  assert.equal(Editor.displayLabel('political_union'), '政治联姻');
  assert.equal(Editor.displayLabel('custom_oath'), 'custom_oath');
});

test('accepts multi-party unions without ethical restrictions', () => {
  const result = Editor.validateDraft({
    id: 'F1',
    kind: 'union',
    subtype: 'partnership',
    participants: ['N1', 'N2', 'N3'].map((nodeId) => ({ nodeId, role: 'partner' })),
  }, ['N1', 'N2', 'N3'].map((id) => ({ id })), []);

  assert.deepEqual(result.errors, []);
});

test('rejects only structural participant and id problems', () => {
  const result = Editor.validateDraft({
    id: 'F2',
    kind: 'parentage',
    participants: [
      { nodeId: 'N1', role: 'parent' },
      { nodeId: 'MISSING', role: 'parent' },
    ],
  }, [{ id: 'N1' }], [{ id: 'F2' }]);

  assert.equal(result.errors.some((error) => error.code === 'DUPLICATE_ID'), true);
  assert.equal(result.errors.some((error) => error.code === 'UNKNOWN_PARTICIPANT'), true);
  assert.equal(result.errors.some((error) => error.code === 'MISSING_CHILD'), true);
  assert.equal(result.errors.some((error) => error.code === 'ETHICAL_RESTRICTION'), false);
});

test('creates deterministic relation ids', () => {
  assert.equal(Editor.nextFamilyRelationId([{ id: 'F2' }, { id: 'F9' }, { id: 'CUSTOM' }]), 'F10');
  assert.equal(Editor.createDraft(null, [{ id: 'F2' }]).id, 'F3');
});

test('normalizes time, participants, and open enum values', () => {
  const relation = Editor.normalizeDraft({
    id: 'F8',
    kind: 'ritual_bond',
    subtype: 'blood_oath',
    status: 'sealed',
    certainty: 'rumored',
    participants: [{ nodeId: 'N1', role: 'witness' }, { nodeId: 'N2', role: 'witness' }],
    startYear: '1820',
    endYear: '',
    episodesText: 'S1E2 S1E4',
    evidenceText: 'Chapter 4\nFamily archive',
  });

  assert.equal(relation.kind, 'ritual_bond');
  assert.equal(relation.subtype, 'blood_oath');
  assert.equal(relation.time.start.year, 1820);
  assert.equal(relation.time.end, null);
  assert.equal(relation.episodes.length, 2);
  assert.equal(relation.evidence.length, 2);
});
