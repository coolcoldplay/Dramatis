const assert = require('node:assert/strict');
const test = require('node:test');

const {
  resolveRenderMode,
  shouldShowLinkLabels,
  shouldUseSimplifiedNodes,
} = require('../render-mode.js');

test('keeps full detail for small graphs', () => {
  const mode = resolveRenderMode({ nodeCount: 100, linkCount: 170 });

  assert.equal(mode.name, 'small');
  assert.equal(mode.showLinkLabels, true);
  assert.equal(mode.showNodeLabels, true);
  assert.equal(mode.simplifyNodes, false);
  assert.equal(shouldShowLinkLabels(mode), true);
  assert.equal(shouldUseSimplifiedNodes(mode), false);
});

test('reduces labels and node decoration for large graphs', () => {
  const mode = resolveRenderMode({ nodeCount: 1500, linkCount: 8000 });

  assert.equal(mode.name, 'large');
  assert.equal(mode.showLinkLabels, false);
  assert.equal(mode.showNodeLabels, false);
  assert.equal(mode.simplifyNodes, true);
  assert.equal(mode.simplifyCurves, true);
  assert.equal(mode.linkTickModulo > 1, true);
});

test('honors an explicit high quality override', () => {
  const mode = resolveRenderMode({ nodeCount: 1500, linkCount: 8000, quality: 'high' });

  assert.equal(mode.name, 'medium');
  assert.equal(mode.showLinkLabels, true);
  assert.equal(mode.simplifyNodes, false);
});
