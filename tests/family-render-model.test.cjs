const assert = require('node:assert/strict');
const test = require('node:test');

const Renderer = require('../src/family/family-renderer.js');

test('encodes relationship meaning as stable CSS classes', () => {
  assert.equal(
    Renderer.relationClass({ kind: 'parentage', subtype: 'adoptive', certainty: 'confirmed' }),
    'family-edge parentage adoptive confirmed',
  );
  assert.equal(
    Renderer.relationClass({ kind: 'ritual bond', subtype: 'blood/oath', certainty: 'not sure' }),
    'family-edge other other unknown',
  );
});

test('selects three stable levels of detail from zoom scale', () => {
  assert.equal(Renderer.nodeLod(0.34), 'far');
  assert.equal(Renderer.nodeLod(0.8), 'medium');
  assert.equal(Renderer.nodeLod(1.4), 'near');
});

test('wraps Latin and CJK names into at most two lines', () => {
  assert.deepEqual(Renderer.wrapFamilyName('Alexandria Catherine', 14), ['Alexandria', 'Catherine']);
  assert.deepEqual(Renderer.wrapFamilyName('亚历山德里亚·凯瑟琳', 6), ['亚历山德里亚', '·凯瑟琳']);
  assert.deepEqual(Renderer.wrapFamilyName('A Very Long Family Name', 10), ['A Very', 'Long Fami…']);
});

test('builds orthogonal SVG paths without invalid coordinates', () => {
  assert.equal(Renderer.pointsToPath([{ x: 0, y: 0 }, { x: 0, y: 10 }, { x: 20, y: 10 }]), 'M0,0L0,10L20,10');
  assert.equal(Renderer.pointsToPath([{ x: NaN, y: 0 }]), '');
});
