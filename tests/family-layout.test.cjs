const assert = require('node:assert/strict');
const test = require('node:test');

const FamilyIndex = require('../src/family/family-index.js');
const Validator = require('../src/family/family-validator.js');
const Layout = require('../src/family/family-layout.js');

function makeGraph(nodes, relations, view = {}) {
  const index = FamilyIndex.buildFamilyIndex(nodes, relations);
  const diagnostics = Validator.validateFamilyGraph(nodes, relations);
  return Layout.buildFamilyRenderModel(nodes, relations, index, diagnostics, view);
}

test('keeps every union as an independent hub and routes children through context unions', () => {
  const nodes = ['P', 'A', 'B', 'C1', 'C2', 'X', 'Y'].map((id) => ({ id, name: id }));
  const relations = [
    { id: 'U1', kind: 'union', subtype: 'marriage', participants: [{ nodeId: 'P', role: 'partner' }, { nodeId: 'A', role: 'partner' }] },
    { id: 'U2', kind: 'union', subtype: 'partnership', participants: [{ nodeId: 'P', role: 'partner' }, { nodeId: 'B', role: 'partner' }] },
    { id: 'U3', kind: 'union', subtype: 'political_union', participants: [{ nodeId: 'X', role: 'partner' }, { nodeId: 'Y', role: 'partner' }] },
    { id: 'F1', kind: 'parentage', contextId: 'U1', participants: [{ nodeId: 'P', role: 'parent' }, { nodeId: 'A', role: 'parent' }, { nodeId: 'C1', role: 'child' }] },
    { id: 'F2', kind: 'parentage', contextId: 'U2', participants: [{ nodeId: 'P', role: 'parent' }, { nodeId: 'B', role: 'parent' }, { nodeId: 'C2', role: 'child' }] },
  ];
  const model = makeGraph(nodes, relations);

  assert.equal(model.personNodes.length, 7);
  assert.equal(model.hubs.filter((hub) => hub.kind === 'union').length, 3);
  assert.equal(model.edges.some((edge) => edge.relationId === 'F2' && edge.sourceId === 'hub:U2' && edge.targetId === 'C2'), true);
  assert.equal(model.edges.some((edge) => edge.relationId === 'F2' && edge.sourceId === 'hub:U1' && edge.targetId === 'C2'), false);

  const layout = Layout.computeFallbackLayout(model, { generationGap: 150, branchGap: 48, componentGap: 120 });
  assert.equal(Layout.isFiniteLayout(layout), true);
  assert.notEqual(layout.nodes.A.x, layout.nodes.B.x);
});

test('marks cycle edges as feedback and always returns finite positions', () => {
  const nodes = [{ id: 'A', name: 'A' }, { id: 'B', name: 'B' }];
  const relations = [
    { id: 'F1', kind: 'parentage', participants: [{ nodeId: 'A', role: 'parent' }, { nodeId: 'B', role: 'child' }] },
    { id: 'F2', kind: 'parentage', participants: [{ nodeId: 'B', role: 'parent' }, { nodeId: 'A', role: 'child' }] },
  ];
  const model = makeGraph(nodes, relations);
  const layout = Layout.computeFallbackLayout(model, {});

  assert.equal(model.edges.some((edge) => edge.feedback === true), true);
  assert.equal(Layout.isFiniteLayout(layout), true);
  assert.equal(Object.values(layout.nodes).every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)), true);
});

test('packs disconnected component bounds without overlap', () => {
  const nodes = ['A', 'B', 'C', 'D', 'E', 'F'].map((id) => ({ id, name: id }));
  const relations = [
    { id: 'U1', kind: 'union', participants: [{ nodeId: 'A', role: 'partner' }, { nodeId: 'B', role: 'partner' }] },
    { id: 'U2', kind: 'union', participants: [{ nodeId: 'C', role: 'partner' }, { nodeId: 'D', role: 'partner' }] },
    { id: 'K1', kind: 'kinship', participants: [{ nodeId: 'E', role: 'member' }, { nodeId: 'F', role: 'member' }] },
  ];
  const model = makeGraph(nodes, relations);
  const layout = Layout.computeFallbackLayout(model, { componentGap: 100 });

  assert.equal(layout.components.length, 3);
  for (let i = 0; i < layout.components.length; i += 1) {
    for (let j = i + 1; j < layout.components.length; j += 1) {
      assert.equal(Layout.boxesOverlap(layout.components[i].bounds, layout.components[j].bounds), false);
    }
  }
});

test('creates a stable ELK graph and cache key from structural settings', () => {
  const nodes = [{ id: 'A', name: 'A' }, { id: 'B', name: 'B' }];
  const relations = [{ id: 'U1', kind: 'union', participants: [{ nodeId: 'A', role: 'partner' }, { nodeId: 'B', role: 'partner' }] }];
  const model = makeGraph(nodes, relations);
  const graph = Layout.buildElkGraph(model, { generationGap: 160, branchGap: 52 });

  assert.equal(graph.layoutOptions['elk.algorithm'], 'layered');
  assert.equal(graph.layoutOptions['elk.direction'], 'DOWN');
  assert.equal(graph.children.length, model.personNodes.length + model.hubs.length);
  assert.equal(Layout.createLayoutCacheKey(model, { generationGap: 160 }), Layout.createLayoutCacheKey(model, { generationGap: 160 }));
  assert.notEqual(Layout.createLayoutCacheKey(model, { generationGap: 160 }), Layout.createLayoutCacheKey(model, { generationGap: 180 }));
});

test('falls back when an async ELK result is invalid and caches a valid layout', async () => {
  const nodes = [{ id: 'A', name: 'A' }, { id: 'B', name: 'B' }];
  const relations = [{ id: 'U1', kind: 'union', participants: [{ nodeId: 'A', role: 'partner' }, { nodeId: 'B', role: 'partner' }] }];
  const model = makeGraph(nodes, relations);
  let calls = 0;
  const engine = Layout.createLayoutEngine({
    elk: { layout: async () => { calls += 1; return { id: 'root', children: [{ id: 'A', x: NaN, y: 0 }] }; } },
  });

  const first = await engine.layout(model, {});
  const second = await engine.layout(model, {});
  assert.equal(Layout.isFiniteLayout(first), true);
  assert.deepEqual(second, first);
  assert.equal(calls, 1);
  engine.dispose();
});

test('groups same-rank people into separated house lanes', () => {
  const nodes = [
    { id: 'A1', name: 'A1', tags: { C3: 'HOUSE_A' } },
    { id: 'B1', name: 'B1', tags: { C3: 'HOUSE_B' } },
    { id: 'A2', name: 'A2', tags: { C3: 'HOUSE_A' } },
    { id: 'B2', name: 'B2', tags: { C3: 'HOUSE_B' } },
  ];
  const relations = [
    { id: 'K1', kind: 'kinship', participants: [{ nodeId: 'A1', role: 'member' }, { nodeId: 'B1', role: 'member' }, { nodeId: 'A2', role: 'member' }, { nodeId: 'B2', role: 'member' }] },
  ];
  const view = { layoutMode: 'house', houseTagCategoryId: 'C3', branchGap: 40 };
  const model = makeGraph(nodes, relations, view);
  const layout = Layout.computeFallbackLayout(model, view);
  const ordered = ['A1', 'A2', 'B1', 'B2'].map((id) => layout.nodes[id].x);

  assert.deepEqual(model.personNodes.map((node) => node.houseId), ['HOUSE_A', 'HOUSE_B', 'HOUSE_A', 'HOUSE_B']);
  assert.equal(ordered[0] < ordered[1] && ordered[1] < ordered[2] && ordered[2] < ordered[3], true);
  assert.ok(ordered[2] - ordered[1] > ordered[1] - ordered[0]);
});

test('bypasses ELK for large render graphs to avoid multi-second layout stalls', async () => {
  const personNodes = Array.from({ length: 401 }, (_, index) => ({
    id: `N${index + 1}`, name: `N${index + 1}`, width: 132, height: 60, order: index,
  }));
  const model = { personNodes, hubs: [], edges: [], generationEdges: [] };
  let elkCalls = 0;
  const engine = Layout.createLayoutEngine({
    elk: { layout: async () => { elkCalls += 1; return null; } },
  });

  const result = await engine.layout(model, {});

  assert.equal(elkCalls, 0);
  assert.equal(result.mode, 'fallback');
  assert.equal(Layout.isFiniteLayout(result), true);
  engine.dispose();
});
