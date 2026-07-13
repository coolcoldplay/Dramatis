const assert = require('node:assert/strict');
const test = require('node:test');

const Validator = require('../src/family/family-validator.js');

test('reports a parentage cycle without rejecting uncommon unions', () => {
  const nodes = ['A', 'B', 'C', 'D'].map((id) => ({ id, name: id }));
  const relations = [
    { id: 'P1', kind: 'parentage', participants: [{ nodeId: 'A', role: 'parent' }, { nodeId: 'B', role: 'child' }] },
    { id: 'P2', kind: 'parentage', participants: [{ nodeId: 'B', role: 'parent' }, { nodeId: 'A', role: 'child' }] },
    { id: 'U1', kind: 'union', participants: [{ nodeId: 'A', role: 'partner' }, { nodeId: 'C', role: 'partner' }] },
    { id: 'U2', kind: 'union', participants: [{ nodeId: 'A', role: 'partner' }, { nodeId: 'D', role: 'partner' }] },
  ];
  const diagnostics = Validator.validateFamilyGraph(nodes, relations);

  assert.equal(diagnostics.some((item) => item.code === 'PARENTAGE_CYCLE' && item.severity === 'warning'), true);
  assert.equal(diagnostics.some((item) => item.code === 'MULTIPLE_UNIONS'), false);
  assert.deepEqual(Validator.findParentageCycles(nodes, relations)[0].nodeIds.sort(), ['A', 'B']);
});

test('keeps missing participants and roles visible to diagnostics', () => {
  const diagnostics = Validator.validateFamilyGraph([], [{
    id: 'F1', kind: 'union', participants: [{ nodeId: 'missing', role: 'partner' }, { nodeId: '', role: '' }],
  }]);

  assert.equal(diagnostics.some((item) => item.code === 'MISSING_PARTICIPANT' && item.relationId === 'F1'), true);
  assert.equal(diagnostics.some((item) => item.code === 'EMPTY_PARTICIPANT_ID'), true);
  assert.equal(Validator.hasFiniteParticipants({ participants: [{ nodeId: 'N1' }] }), true);
  assert.equal(Validator.hasFiniteParticipants({ participants: [{ nodeId: '' }] }), false);
});

test('reports structural parentage problems and unknown contexts', () => {
  const nodes = [{ id: 'P' }, { id: 'C' }];
  const diagnostics = Validator.validateFamilyGraph(nodes, [
    { id: 'F1', kind: 'parentage', contextId: 'UNKNOWN', participants: [{ nodeId: 'P', role: 'parent' }] },
    { id: 'F2', kind: 'parentage', participants: [{ nodeId: 'C', role: 'child' }] },
  ]);

  assert.equal(diagnostics.some((item) => item.code === 'PARENTAGE_WITHOUT_CHILD' && item.severity === 'error'), true);
  assert.equal(diagnostics.some((item) => item.code === 'PARENTAGE_WITHOUT_PARENT' && item.severity === 'error'), true);
  assert.equal(diagnostics.some((item) => item.code === 'UNKNOWN_CONTEXT' && item.severity === 'warning'), true);
});

test('does not treat disputed, supernatural, multi-parent, or multi-party facts as errors', () => {
  const nodes = ['P1', 'P2', 'P3', 'C'].map((id) => ({ id }));
  const diagnostics = Validator.validateFamilyGraph(nodes, [
    {
      id: 'F1', kind: 'parentage', subtype: 'supernatural', certainty: 'disputed',
      participants: [
        { nodeId: 'P1', role: 'parent' }, { nodeId: 'P2', role: 'parent' },
        { nodeId: 'P3', role: 'parent' }, { nodeId: 'C', role: 'child' },
      ],
    },
    {
      id: 'F2', kind: 'union', subtype: 'partnership',
      participants: [{ nodeId: 'P1', role: 'partner' }, { nodeId: 'P2', role: 'partner' }, { nodeId: 'P3', role: 'partner' }],
    },
  ]);

  assert.equal(diagnostics.some((item) => item.severity === 'error'), false);
});
