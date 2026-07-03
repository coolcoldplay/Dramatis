const assert = require('node:assert/strict');
const test = require('node:test');

const {
  calculateLabelDeclutterImpulses,
  labelBoxesOverlap,
  resolveLabelOffsets,
} = require('../link-label-declutter.js');

test('detects overlapping label boxes with padding', () => {
  assert.equal(labelBoxesOverlap(
    { x: 100, y: 100, width: 80, height: 20 },
    { x: 150, y: 108, width: 80, height: 20 },
    4
  ), true);

  assert.equal(labelBoxesOverlap(
    { x: 100, y: 100, width: 80, height: 20 },
    { x: 260, y: 100, width: 80, height: 20 },
    4
  ), false);
});

test('creates impulses for nodes attached to overlapping labels', () => {
  const impulses = calculateLabelDeclutterImpulses([
    { linkId: 'L1', sourceId: 'N1', targetId: 'N2', x: 100, y: 100, width: 120, height: 18 },
    { linkId: 'L2', sourceId: 'N3', targetId: 'N4', x: 130, y: 104, width: 120, height: 18 },
  ], { padding: 8, strength: 1 });

  assert.ok(impulses.size >= 4);
  assert.ok(Math.abs(impulses.get('N1').x) > 0 || Math.abs(impulses.get('N1').y) > 0);
  assert.equal(Math.sign(impulses.get('N1').x), -Math.sign(impulses.get('N3').x));
});

test('does not move nodes when labels do not overlap', () => {
  const impulses = calculateLabelDeclutterImpulses([
    { linkId: 'L1', sourceId: 'N1', targetId: 'N2', x: 100, y: 100, width: 80, height: 18 },
    { linkId: 'L2', sourceId: 'N3', targetId: 'N4', x: 320, y: 100, width: 80, height: 18 },
  ], { padding: 4, strength: 1 });

  assert.equal(impulses.size, 0);
});

test('resolves overlapping label offsets while staying near anchors', () => {
  const offsets = resolveLabelOffsets([
    { linkId: 'L1', x: 100, y: 100, width: 100, height: 18 },
    { linkId: 'L2', x: 112, y: 104, width: 100, height: 18 },
  ], { padding: 6, iterations: 50, maxShift: 90, anchorStrength: 0 });

  assert.equal(offsets.size, 2);
  const l1 = offsets.get('L1');
  const l2 = offsets.get('L2');
  assert.ok(Math.abs(l1.x) > 0 || Math.abs(l1.y) > 0);
  assert.ok(Math.abs(l2.x) > 0 || Math.abs(l2.y) > 0);
  assert.ok(Math.hypot(l1.x, l1.y) <= 90);
  assert.ok(Math.hypot(l2.x, l2.y) <= 90);

  const movedA = { x: 100 + l1.x, y: 100 + l1.y, width: 100, height: 18 };
  const movedB = { x: 112 + l2.x, y: 104 + l2.y, width: 100, height: 18 };
  assert.equal(labelBoxesOverlap(movedA, movedB, 6), false);
});
