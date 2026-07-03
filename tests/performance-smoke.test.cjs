const assert = require('node:assert/strict');
const test = require('node:test');
const { performance } = require('node:perf_hooks');

const {
  buildGraphIndex,
  resolveLinkEndpoints,
} = require('../graph-index.js');

function makeGraph(nodeCount, linkCount) {
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({ id: `N${i + 1}` }));
  const links = Array.from({ length: linkCount }, (_, i) => ({
    id: `L${i + 1}`,
    source: `N${(i % nodeCount) + 1}`,
    target: `N${((i * 7 + 13) % nodeCount) + 1}`,
  }));
  return { nodes, links };
}

test('resolves and indexes a dense graph within an interactive budget', () => {
  const { nodes, links } = makeGraph(1200, 6000);
  const start = performance.now();
  const resolved = resolveLinkEndpoints(nodes, links);
  const index = buildGraphIndex(nodes, resolved.links);
  const elapsed = performance.now() - start;

  assert.equal(resolved.links.length, 6000);
  assert.equal(index.nodesById.size, 1200);
  assert.ok(elapsed < 250, `expected under 250ms, got ${elapsed.toFixed(1)}ms`);
});
