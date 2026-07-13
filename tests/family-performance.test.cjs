const assert = require('node:assert/strict');
const test = require('node:test');
const { performance } = require('node:perf_hooks');

const FamilyIndex = require('../src/family/family-index.js');
const FamilyValidator = require('../src/family/family-validator.js');
const FamilyLayout = require('../src/family/family-layout.js');
const { generateFamilyGraph } = require('./helpers/family-fixture.cjs');

function benchmark(nodeCount, relationCount) {
  const graph = generateFamilyGraph(nodeCount, relationCount);
  const start = performance.now();
  const index = FamilyIndex.buildFamilyIndex(graph.nodes, graph.familyRelations);
  const indexedAt = performance.now();
  const diagnostics = FamilyValidator.validateFamilyGraph(graph.nodes, graph.familyRelations);
  const validatedAt = performance.now();
  const model = FamilyLayout.buildFamilyRenderModel(
    graph.nodes, graph.familyRelations, index, diagnostics, graph.familyView,
  );
  const modeledAt = performance.now();
  const layout = FamilyLayout.computeFallbackLayout(model, graph.familyView);
  const laidOutAt = performance.now();
  const searchStart = performance.now();
  const matches = index.searchFuzzy('synthetic note');
  const searchedAt = performance.now();

  return {
    graph, index, model, layout, diagnostics, matches,
    timings: {
      index: indexedAt - start,
      validate: validatedAt - indexedAt,
      model: modeledAt - validatedAt,
      layout: laidOutAt - modeledAt,
      search: searchedAt - searchStart,
      total: laidOutAt - start,
    },
  };
}

test('processes 500 people and 1000 family relations within the interactive budget', (t) => {
  const result = benchmark(500, 1000);
  t.diagnostic(JSON.stringify(result.timings));

  assert.equal(result.index.nodeById.size, 500);
  assert.equal(result.model.personNodes.length, 500);
  assert.equal(FamilyLayout.isFiniteLayout(result.layout), true);
  assert.ok(result.matches.length > 0);
  assert.ok(result.timings.total < 1500, `expected under 1500ms, got ${result.timings.total.toFixed(1)}ms`);
  assert.ok(result.timings.search < 100, `search exceeded 100ms: ${result.timings.search.toFixed(1)}ms`);
});

test('processes 1000 people and 2000 family relations without invalid coordinates', (t) => {
  const result = benchmark(1000, 2000);
  t.diagnostic(JSON.stringify(result.timings));

  assert.equal(result.index.nodeById.size, 1000);
  assert.equal(result.model.personNodes.length, 1000);
  assert.equal(FamilyLayout.isFiniteLayout(result.layout), true);
  assert.ok(result.timings.total < 3000, `expected under 3000ms, got ${result.timings.total.toFixed(1)}ms`);
  assert.ok(result.timings.search < 100, `search exceeded 100ms: ${result.timings.search.toFixed(1)}ms`);
});
