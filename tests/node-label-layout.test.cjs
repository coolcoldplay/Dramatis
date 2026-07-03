const assert = require('node:assert/strict');
const test = require('node:test');

const {
  estimateMaxCharsPerLine,
  normalizeNodeLabelPlacement,
  wrapNodeLabel,
} = require('../node-label-layout.js');

test('normalizes node label placement values', () => {
  assert.equal(normalizeNodeLabelPlacement('inside'), 'inside');
  assert.equal(normalizeNodeLabelPlacement('outside'), 'outside');
  assert.equal(normalizeNodeLabelPlacement('below'), 'outside');
  assert.equal(normalizeNodeLabelPlacement(undefined), 'outside');
});

test('wraps spaced names without splitting short words', () => {
  assert.deepEqual(wrapNodeLabel('Audrey Horne', {
    maxCharsPerLine: 6,
    maxLines: 3,
  }), ['Audrey', 'Horne']);

  assert.deepEqual(wrapNodeLabel('Laura Palmer', {
    maxCharsPerLine: 7,
    maxLines: 3,
  }), ['Laura', 'Palmer']);
});

test('splits long unspaced labels and ellipsizes overflow', () => {
  assert.deepEqual(wrapNodeLabel('ABCDEFGHIJKLMN', {
    maxCharsPerLine: 4,
    maxLines: 3,
  }), ['ABCD', 'EFGH', 'I...']);
});

test('wraps CJK names by character budget', () => {
  assert.deepEqual(wrapNodeLabel('黑色小屋里的巨人', {
    maxCharsPerLine: 4,
    maxLines: 3,
  }), ['黑色小屋', '里的巨人']);
});

test('estimates a conservative character budget from radius and font size', () => {
  assert.equal(estimateMaxCharsPerLine(28, 13), 5);
  assert.equal(estimateMaxCharsPerLine(10, 20), 1);
});
