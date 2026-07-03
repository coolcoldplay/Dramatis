const assert = require('node:assert/strict');
const test = require('node:test');

const {
  calculateLabelForcePlan,
  calculateLabelDeclutterImpulses,
  labelBoxesOverlap,
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

test('plans node forces and link distance boosts for overlapping labels', () => {
  const plan = calculateLabelForcePlan([
    {
      linkId: 'L1',
      sourceId: 'A',
      targetId: 'B',
      x: 100,
      y: 100,
      sourceX: 60,
      sourceY: 100,
      targetX: 140,
      targetY: 100,
      width: 120,
      height: 18,
    },
    {
      linkId: 'L2',
      sourceId: 'C',
      targetId: 'D',
      x: 124,
      y: 104,
      sourceX: 84,
      sourceY: 104,
      targetX: 164,
      targetY: 104,
      width: 120,
      height: 18,
    },
  ], { padding: 8, strength: 1 });

  assert.equal(plan.overlapCount, 1);
  assert.equal(plan.labelOffsets, undefined);
  assert.ok(plan.linkDistanceBoosts.get('L1') >= 120);
  assert.ok(plan.linkDistanceBoosts.get('L2') >= 120);

  const a = plan.impulses.get('A');
  const b = plan.impulses.get('B');
  const c = plan.impulses.get('C');
  const d = plan.impulses.get('D');
  assert.ok(a && b && c && d);

  assert.ok((b.x - a.x) > 0, 'L1 endpoints should be pushed apart along the link');
  assert.ok((d.x - c.x) > 0, 'L2 endpoints should be pushed apart along the link');
});

test('does not plan node movement when link labels do not overlap', () => {
  const plan = calculateLabelForcePlan([
    { linkId: 'L1', sourceId: 'A', targetId: 'B', x: 100, y: 100, sourceX: 60, sourceY: 100, targetX: 140, targetY: 100, width: 80, height: 18 },
    { linkId: 'L2', sourceId: 'C', targetId: 'D', x: 300, y: 100, sourceX: 260, sourceY: 100, targetX: 340, targetY: 100, width: 80, height: 18 },
  ], { padding: 4, strength: 1 });

  assert.equal(plan.overlapCount, 0);
  assert.equal(plan.impulses.size, 0);
  assert.equal(plan.linkDistanceBoosts.size, 0);
});

test('plans node forces when a link label overlaps a node or node name obstacle', () => {
  const plan = calculateLabelForcePlan([
    {
      linkId: 'L1',
      sourceId: 'A',
      targetId: 'B',
      x: 100,
      y: 100,
      sourceX: 60,
      sourceY: 100,
      targetX: 140,
      targetY: 100,
      width: 90,
      height: 18,
    },
  ], {
    padding: 8,
    strength: 1,
    obstacles: [
      { id: 'node-C-circle', nodeId: 'C', x: 108, y: 104, width: 62, height: 62 },
      { id: 'node-C-name', nodeId: 'C', x: 112, y: 126, width: 88, height: 18 },
    ],
  });

  assert.equal(plan.overlapCount, 2);
  assert.ok(plan.linkDistanceBoosts.get('L1') >= 90);
  assert.ok(plan.impulses.has('A'));
  assert.ok(plan.impulses.has('B'));
  assert.ok(plan.impulses.has('C'));
});
