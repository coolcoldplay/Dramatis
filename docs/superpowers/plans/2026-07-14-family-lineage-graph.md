# Family Lineage Graph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the lossy tree-only family view with a versioned, backward-compatible lineage graph that correctly handles multiple unions, multiple parentage types, disputed relations, disconnected houses, and large datasets.

**Architecture:** Keep the no-build UMD structure. Normalize v4/v5 family data into `state.familyRelations`, build reusable indices and diagnostics, transform relationship hyperedges into person and hub nodes, and run deterministic ELK layered layout through a worker when available. Render a static SVG workspace whose selection and search interactions never re-run layout.

**Tech Stack:** Plain HTML/CSS/JavaScript, D3 v7, elkjs 0.11.1, Node `node:test`, Codex in-app browser automation, no bundler.

---

## File Structure

- Create `src/family/family-schema.js`: v5 defaults, v4 migration, v5/v4 serialization, family view normalization.
- Create `src/family/family-index.js`: O(N+E) person/relation, ancestry, component, and alias indices.
- Create `src/family/family-validator.js`: structural diagnostics and parentage SCC detection.
- Create `src/family/family-layout.js`: render-model construction, ELK graph input, layout cache, finite-result validation, component packing.
- Create `src/family/family-layout-worker.js`: worker protocol around `elk-api.js` and `elk-worker.min.js`.
- Create `src/family/family-renderer.js`: keyed SVG layers, node cards, relation hubs, routed edges, LOD, and class-diff highlighting.
- Create `src/family/family-view.js`: overlay lifecycle, controls, filters, focus, search, collapse, diagnostics, and layout coordination.
- Create `src/family/family-editor.js`: structured family relation editor.
- Create `src/family/family-export.js`: standalone SVG model and PNG/SVG export.
- Create `styles/family-tree.css`: full family workspace visual and responsive rules.
- Create `vendor/elk/elk-api.js`, `vendor/elk/elk-worker.min.js`, `vendor/elk/elk.bundled.js`, `vendor/elk/LICENSE.md`: pinned elkjs 0.11.1 runtime.
- Modify `src/app-state.js`: add `familyRelations`, `familyView`, and `familyDiagnostics`.
- Modify `src/import-export.js`: normalize and return family v5 fields.
- Modify `index.html`: add markup/script tags, export v5 fields, bind new view, then remove legacy family implementation.
- Update `D:/OneDrive/OneDrive - 南方医科大学/桌面/AI project/剧情人物梳理/示例数据/JSON-SPEC.md`: document v5 and compatibility.
- Create family fixtures and tests under `tests/fixtures/family/` and `tests/family-*.test.cjs`.

## Task 1: Add Family Schema And v4 Migration

**Files:**
- Create: `src/family/family-schema.js`
- Create: `tests/family-schema.test.cjs`
- Create: `tests/fixtures/family/simple-v5.json`
- Create: `tests/fixtures/family/twin-peaks-v4.json`
- Modify: `src/app-state.js`
- Modify: `src/import-export.js`

- [ ] **Step 1: Write failing schema tests**

Add tests for v5 normalization, conservative v4 migration, authoritative v5 relations, unknown subtype preservation, and family view defaults:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const FamilySchema = require('../src/family/family-schema.js');

test('migrates every legacy family link without inventing parents', () => {
  const links = [
    { id: 'L1', source: 'N1', target: 'N2', familyRelation: 'spouse' },
    { id: 'L2', source: 'N1', target: 'N3', familyRelation: 'parent' },
    { id: 'L3', source: 'N4', target: 'N3', familyRelation: 'sibling' },
  ];
  const result = FamilySchema.normalizeFamilyGraph({ nodes: [], links });
  assert.equal(result.familyRelations.length, 3);
  assert.deepEqual(result.familyRelations.map(r => r.kind), ['union', 'parentage', 'kinship']);
  assert.equal(result.familyRelations.some(r => r.inferred), false);
});

test('uses v5 familyRelations as the authority', () => {
  const result = FamilySchema.normalizeFamilyGraph({
    links: [{ id: 'L1', source: 'N1', target: 'N2', familyRelation: 'spouse' }],
    familyRelations: [{
      id: 'F9', kind: 'union', subtype: 'political_union',
      participants: [{ nodeId: 'N1', role: 'partner' }, { nodeId: 'N3', role: 'partner' }],
      certainty: 'confirmed'
    }]
  });
  assert.equal(result.familyRelations.length, 1);
  assert.equal(result.familyRelations[0].id, 'F9');
  assert.equal(result.migratedLegacy, false);
});

test('normalizes family view settings', () => {
  assert.deepEqual(FamilySchema.normalizeFamilyView({ generationGap: 9999 }), {
    layoutMode: 'lineage', houseTagCategoryId: null,
    generationGap: 260, branchGap: 48, componentGap: 120,
    collapsedNodeIds: []
  });
});
```

- [ ] **Step 2: Run the schema test and confirm failure**

Run: `node --test tests\family-schema.test.cjs`  
Expected: FAIL because `src/family/family-schema.js` does not exist.

- [ ] **Step 3: Implement the UMD schema module**

Expose exactly:

```js
window.DramatisFamilySchema = {
  FAMILY_DEFAULTS,
  normalizeFamilyRelation,
  normalizeFamilyRelations,
  normalizeFamilyView,
  migrateLegacyFamilyRelations,
  normalizeFamilyGraph,
  exportLegacyFamilyRelations,
};
```

Use `FAMILY_DEFAULTS` with the enum values from the approved design. `normalizeFamilyGraph(input)` must return `{ familyRelations, familyView, migratedLegacy }`. Legacy IDs use deterministic `FLEGACY_<link.id>` values. Unknown kind/subtype/status values are preserved as strings. A parentage event always keeps one child and one or more parent roles; malformed input is retained for the validator rather than dropped.

- [ ] **Step 4: Integrate normalized fields into app state and import**

Add to `createInitialState()`:

```js
familyRelations: [],
familyView: DramatisFamilySchema
  ? DramatisFamilySchema.normalizeFamilyView({})
  : { layoutMode: 'lineage', houseTagCategoryId: null, generationGap: 150, branchGap: 48, componentGap: 120, collapsedNodeIds: [] },
familyDiagnostics: [],
```

In `normalizeImportedGraph`, call `opts.familySchema.normalizeFamilyGraph(input)` and return its fields. Pass `window.DramatisFamilySchema` from the import handler.

- [ ] **Step 5: Add fixtures and run tests**

Copy the family-linked subset of `data/twin-peaks-season-2.json` to `tests/fixtures/family/twin-peaks-v4.json`. Create `simple-v5.json` with one union and one parentage event. Run:

`node --test tests\family-schema.test.cjs tests\import-export.test.cjs tests\app-state.test.cjs`

Expected: all PASS.

- [ ] **Step 6: Commit schema foundation**

```bash
git add src/family/family-schema.js src/app-state.js src/import-export.js tests/family-schema.test.cjs tests/fixtures/family
git commit -m "feat: add versioned family relation schema"
```

## Task 2: Build Family Indices And Diagnostics

**Files:**
- Create: `src/family/family-index.js`
- Create: `src/family/family-validator.js`
- Create: `tests/family-index.test.cjs`
- Create: `tests/family-validator.test.cjs`
- Create: `tests/fixtures/family/parentage-cycle.json`
- Create: `tests/fixtures/family/disputed-parentage.json`

- [ ] **Step 1: Write index tests**

Cover aliases, parent/child lookups, union membership, connected components, ancestors, descendants, and exact versus fuzzy search. Assert that `buildFamilyIndex()` does not call `Array.find` by providing frozen input arrays and checking returned Maps/Sets.

```js
const index = FamilyIndex.buildFamilyIndex(nodes, relations);
assert.deepEqual([...index.parentsByChild.get('C')], ['P1', 'P2']);
assert.deepEqual([...index.childrenByParent.get('P1')], ['C']);
assert.deepEqual(index.searchExact('aureliano').map(n => n.id), ['N1']);
assert.equal(index.components.length, 2);
```

- [ ] **Step 2: Write validator tests**

```js
test('reports a parentage cycle without rejecting uncommon unions', () => {
  const diagnostics = Validator.validateFamilyGraph(nodes, relations);
  assert.equal(diagnostics.some(d => d.code === 'PARENTAGE_CYCLE' && d.severity === 'warning'), true);
  assert.equal(diagnostics.some(d => d.code === 'MULTIPLE_UNIONS'), false);
});

test('keeps missing participants visible to diagnostics', () => {
  const diagnostics = Validator.validateFamilyGraph([], [{
    id: 'F1', kind: 'union', participants: [{ nodeId: 'missing', role: 'partner' }]
  }]);
  assert.equal(diagnostics[0].code, 'MISSING_PARTICIPANT');
  assert.equal(diagnostics[0].relationId, 'F1');
});
```

- [ ] **Step 3: Run focused tests and confirm failure**

Run: `node --test tests\family-index.test.cjs tests\family-validator.test.cjs`  
Expected: FAIL because both modules are missing.

- [ ] **Step 4: Implement `family-index.js`**

Expose `buildFamilyIndex(nodes, relations)`. The result contains:

```js
{
  nodeById, relationById, relationsByNode,
  parentsByChild, childrenByParent, unionsByNode,
  kinshipByNode, successionByNode,
  components, ancestorsOf, descendantsOf,
  neighborhoodOf, searchExact, searchFuzzy
}
```

Use Maps/Sets, iterative queues, normalized lowercase strings, and alias indexing. `searchExact` matches only `name` or aliases; `searchFuzzy` also checks notes, titles, labels, tags supplied through options.

- [ ] **Step 5: Implement `family-validator.js`**

Use iterative Tarjan SCC over parent-to-child edges. Expose:

```js
{
  validateFamilyGraph(nodes, relations),
  findParentageCycles(nodes, relations),
  hasFiniteParticipants(relation)
}
```

Return diagnostics with `{ id, severity, code, message, relationId, nodeIds }`. Do not diagnose multiple unions, close kin, more than two parents, cross-generation unions, or supernatural parentage as errors. Close-kin detection is an `info` diagnostic only when enabled by options.

- [ ] **Step 6: Run family foundation tests**

Run: `node --test tests\family-schema.test.cjs tests\family-index.test.cjs tests\family-validator.test.cjs`  
Expected: all PASS.

- [ ] **Step 7: Commit indexing and validation**

```bash
git add src/family/family-index.js src/family/family-validator.js tests/family-index.test.cjs tests/family-validator.test.cjs tests/fixtures/family
git commit -m "feat: index and validate family graphs"
```

## Task 3: Vendor ELK And Implement Deterministic Layout Model

**Files:**
- Create: `vendor/elk/elk-api.js`
- Create: `vendor/elk/elk-worker.min.js`
- Create: `vendor/elk/elk.bundled.js`
- Create: `vendor/elk/LICENSE.md`
- Create: `src/family/family-layout.js`
- Create: `src/family/family-layout-worker.js`
- Create: `tests/family-layout.test.cjs`
- Create: `tests/fixtures/family/multiple-unions.json`
- Create: `tests/fixtures/family/disconnected-houses.json`

- [ ] **Step 1: Acquire pinned ELK assets**

Download elkjs 0.11.1 from npm into a temporary directory, verify package version and license, then copy only `lib/elk-api.js`, `lib/elk-worker.min.js`, `lib/elk.bundled.js`, and `LICENSE.md` into `vendor/elk/`. Record version and upstream URL at the top of `vendor/elk/LICENSE.md`.

- [ ] **Step 2: Write layout model tests**

Tests must verify:

```js
const model = Layout.buildFamilyRenderModel(nodes, relations, index, diagnostics, view);
assert.equal(model.personNodes.length, 7);
assert.equal(model.hubs.filter(h => h.kind === 'union').length, 3);
assert.equal(model.edges.some(e => e.relationId === 'F_SECOND_UNION' && e.targetId === 'N_CHILD_2'), true);

const positions = Layout.computeFallbackLayout(model, view);
assert.equal(Object.values(positions.nodes).every(p => Number.isFinite(p.x) && Number.isFinite(p.y)), true);
assert.notEqual(positions.nodes.N_SECOND_PARTNER.x, positions.nodes.N_FIRST_PARTNER.x);
```

Add a cycle fixture and assert finite coordinates plus `feedback: true` on the cycle edge. Add disconnected houses and assert bounding boxes do not overlap.

- [ ] **Step 3: Run layout tests and confirm failure**

Run: `node --test tests\family-layout.test.cjs`  
Expected: FAIL because `family-layout.js` is missing.

- [ ] **Step 4: Implement render-model construction**

Expose:

```js
{
  buildFamilyRenderModel,
  buildElkGraph,
  normalizeElkResult,
  computeFallbackLayout,
  createLayoutCacheKey,
  isFiniteLayout,
  createLayoutEngine
}
```

Person IDs remain raw node IDs in the output. Hub IDs use `hub:<relationId>`. Parentage edges are parent -> hub -> child. Union participants connect laterally to a union hub. `contextId` causes parentage output to reuse the matching union hub. Invalid relations stay in diagnostics but do not produce layout edges.

The deterministic fallback computes parentage ranks, barycentric ordering within ranks, relation-hub coordinates, orthogonal routes, and compact shelf packing for disconnected components. It must be good enough for `file://` and for tests even when ELK is unavailable.

- [ ] **Step 5: Add ELK adapter and worker protocol**

`createLayoutEngine(options)` returns an object with:

```js
{
  layout(model, viewOptions),
  cancel(),
  dispose(),
  mode: 'worker' | 'main' | 'fallback'
}
```

Use worker ELK for HTTP/HTTPS, bundled main-thread ELK when Worker creation fails, and deterministic fallback when ELK cannot load. Set ELK options to layered, DOWN direction, ORTHOGONAL routing, stable model order, and spacing values from familyView. Reject non-finite results and fall back without clearing the previous valid layout.

- [ ] **Step 6: Run layout and full unit tests**

Run: `node --test tests\family-*.test.cjs tests\*.test.cjs`  
Expected: all PASS.

- [ ] **Step 7: Commit layout engine**

```bash
git add vendor/elk src/family/family-layout.js src/family/family-layout-worker.js tests/family-layout.test.cjs tests/fixtures/family
git commit -m "feat: add deterministic lineage layout engine"
```

## Task 4: Build Static SVG Renderer And Family Styles

**Files:**
- Create: `src/family/family-renderer.js`
- Create: `styles/family-tree.css`
- Create: `tests/family-render-model.test.cjs`
- Modify: `index.html`

- [ ] **Step 1: Write render-model tests**

Test pure helpers exported by the renderer:

```js
assert.equal(Renderer.relationClass({ kind: 'parentage', subtype: 'adoptive', certainty: 'confirmed' }), 'family-edge parentage adoptive confirmed');
assert.equal(Renderer.nodeLod(0.34), 'far');
assert.equal(Renderer.nodeLod(0.8), 'medium');
assert.equal(Renderer.nodeLod(1.4), 'near');
assert.deepEqual(Renderer.wrapFamilyName('Alexandria Catherine', 14), ['Alexandria', 'Catherine']);
```

- [ ] **Step 2: Run and confirm failure**

Run: `node --test tests\family-render-model.test.cjs`  
Expected: FAIL because the renderer is missing.

- [ ] **Step 3: Add family workspace markup**

Replace the old overlay body with semantic markup containing:

```html
<div class="family-workspace" id="family-tree-overlay" role="dialog" aria-modal="true" aria-labelledby="family-workspace-title" hidden>
  <header class="family-toolbar">...</header>
  <aside class="family-filters" id="family-filters">...</aside>
  <main class="family-canvas-wrap"><svg id="family-tree-svg" aria-label="谱系关系图"></svg></main>
  <aside class="family-inspector" id="family-inspector" hidden>...</aside>
  <section class="family-diagnostics" id="family-diagnostics" hidden>...</section>
</div>
```

Use current toolbar icon assets and accessible text/title attributes. Controls must have stable IDs consumed by `family-view.js`.

- [ ] **Step 4: Implement the renderer**

`createFamilyRenderer({ svg, d3, callbacks })` returns:

```js
{
  render(layout, renderState),
  updateHighlight(highlightState),
  updateLod(scale),
  fitView(options),
  zoomBy(factor),
  destroy()
}
```

Create stable groups for backgrounds, edges, hubs, nodes, and overlays. Use keyed D3 joins. Pan/zoom updates one root transform only. Node cards use 132x60 stable dimensions, two-line names, optional avatar/initial, house stripe, metadata line, and fold count. Edge classes encode kind/subtype/certainty without relying on color. Rendering does not call the layout engine.

- [ ] **Step 5: Add responsive CSS**

Define a neutral dark family workspace consistent with current tokens. Use 44px tool targets, `:focus-visible`, 132x60 node cards, relation line dash patterns, LOD classes, desktop side panels, and mobile drawers at `max-width: 720px`. Ensure toolbar controls wrap into a second row rather than overflow.

- [ ] **Step 6: Run render tests and syntax checks**

Run:

```powershell
node --test tests\family-render-model.test.cjs
node --check src\family\family-renderer.js
```

Expected: PASS and no syntax output.

- [ ] **Step 7: Commit renderer shell**

```bash
git add src/family/family-renderer.js styles/family-tree.css tests/family-render-model.test.cjs index.html
git commit -m "feat: render interactive lineage workspace"
```

## Task 5: Implement Family View Coordination And Interaction

**Files:**
- Create: `src/family/family-view.js`
- Create: `tests/family-view-state.test.cjs`
- Modify: `index.html`

- [ ] **Step 1: Write view-state tests**

Test pure reducers/helpers:

```js
let view = View.createFamilyViewState();
view = View.reduceFamilyView(view, { type: 'SELECT_NODE', nodeId: 'N1' });
assert.equal(view.selectedNodeId, 'N1');
assert.equal(view.layoutRevision, 0);

view = View.reduceFamilyView(view, { type: 'SET_FILTER', key: 'certainty', value: ['confirmed'] });
assert.equal(view.layoutRevision, 1);

assert.deepEqual(View.exactFamilySearch(index, 'Arya').map(n => n.name), ['Arya']);
```

- [ ] **Step 2: Run and confirm failure**

Run: `node --test tests\family-view-state.test.cjs`  
Expected: FAIL because `family-view.js` is missing.

- [ ] **Step 3: Implement the family view controller**

Expose `DramatisFamilyView.createFamilyView(options)`. The returned controller has:

```js
{
  open(), close(), relayout(reason),
  setFilter(key, value), selectNode(nodeId), selectRelation(relationId),
  focusNode(nodeId, depth), clearFocus(), toggleCollapse(nodeId),
  search(query, fuzzy), exportState(), destroy()
}
```

Opening builds schema/index/diagnostics once and starts layout. Selection, inspector, search, and highlight only call renderer class-diff methods. Structural filters, collapse, layout mode, spacing, current episode, and show-hidden changes invalidate layout. Use an incrementing request token so stale async layouts cannot overwrite newer results.

- [ ] **Step 4: Bind controls and focus management**

Bind segmented modes, exact/fuzzy search, filters, spacing sliders, diagnostics, fit/zoom/export, close, drawers, and inspector. On open, remember the trigger button and focus the title/search; on close, restore focus. Esc closes inspector/drawer/diagnostics before the entire workspace.

- [ ] **Step 5: Integrate with application state**

Create the controller after state and graph rendering are initialized. Pass callbacks for `isNodeVisible`, `isLinkVisible`, current episode, tags, tooltip, and state updates. Change the existing family button to `familyView.open()`. Do not remove the legacy functions yet.

- [ ] **Step 6: Run interaction-state and full tests**

Run: `node --test tests\family-view-state.test.cjs tests\family-*.test.cjs tests\*.test.cjs`  
Expected: all PASS.

- [ ] **Step 7: Commit view coordination**

```bash
git add src/family/family-view.js tests/family-view-state.test.cjs index.html
git commit -m "feat: add lineage filters focus and diagnostics"
```

## Task 6: Add Structured Relation Editor And v5 Persistence

**Files:**
- Create: `src/family/family-editor.js`
- Create: `tests/family-editor.test.cjs`
- Modify: `index.html`
- Modify: `src/import-export.js`
- Modify: `tests/import-export.test.cjs`

- [ ] **Step 1: Write editor helper tests**

Cover kind-dependent roles/statuses, participant validation, deterministic IDs, and no ethical restrictions:

```js
assert.deepEqual(Editor.allowedRoles('parentage'), ['parent', 'child']);
assert.equal(Editor.validateDraft({
  kind: 'union', subtype: 'partnership',
  participants: ['N1', 'N2', 'N3'].map(nodeId => ({ nodeId, role: 'partner' }))
}).errors.length, 0);
```

- [ ] **Step 2: Extend JSON export tests**

Assert standard export includes `version: 5`, familyRelations, familyView, graphStyle, forceConfig, clusterSpacing, and topologySizing. Assert v4 compatibility export reports `losses` for multi-party unions and certainty/time metadata.

- [ ] **Step 3: Implement editor helpers and modal binding**

Expose:

```js
{
  allowedSubtypes, allowedRoles, allowedStatuses,
  createDraft, validateDraft, normalizeDraft,
  bindFamilyEditor
}
```

The UI supports adding/removing any number of participants, selecting roles, type/subtype/status/certainty, context union, time, episodes, evidence, notes, and hidden state. Validation blocks only missing IDs, missing required roles, duplicate relation ID, and unknown participants.

- [ ] **Step 4: Make v5 export/import authoritative**

Update the standard export object and import assignment:

```js
version: 5,
familyRelations: state.familyRelations.map(serializeFamilyRelation),
familyView: DramatisFamilySchema.normalizeFamilyView(state.familyView),
```

The import handler assigns both fields and rebuilds family state on the next open. Add a compatibility export method returning `{ data, losses }`; show a confirmation dialog before downloading when losses are non-empty.

- [ ] **Step 5: Run editor and persistence tests**

Run: `node --test tests\family-editor.test.cjs tests\family-schema.test.cjs tests\import-export.test.cjs`  
Expected: all PASS.

- [ ] **Step 6: Commit editor and persistence**

```bash
git add src/family/family-editor.js tests/family-editor.test.cjs src/import-export.js tests/import-export.test.cjs index.html
git commit -m "feat: edit and persist complex family relations"
```

## Task 7: Add Family SVG/PNG Export And Documentation

**Files:**
- Create: `src/family/family-export.js`
- Create: `tests/family-export.test.cjs`
- Modify: `index.html`
- Modify: `D:/OneDrive/OneDrive - 南方医科大学/桌面/AI project/剧情人物梳理/示例数据/JSON-SPEC.md`

- [ ] **Step 1: Write export helper tests**

Test XML escaping, complete layout bounds, dash patterns, Chinese labels, background/transparent modes, and legend inclusion. `buildFamilyExportSvg(layout, state, options)` must return standalone SVG text without reading current zoom transform.

- [ ] **Step 2: Implement family export**

Expose:

```js
{
  buildFamilyExportSvg,
  downloadFamilySvg,
  downloadFamilyPng,
  computeExportBounds
}
```

PNG rasterizes the generated standalone SVG at 2x/3x/4x, revokes object URLs, handles avatar CORS failure by retrying without the offending avatar, and preserves Chinese font fallback. SVG includes the relationship legend and current visible filters.

- [ ] **Step 3: Update JSON-SPEC to version 5**

Document familyRelations, familyView, node aliases/titles/birth/death/generationLabel, v4 migration authority rules, compatibility export losses, and complete examples for union, parentage, kinship, disputed relation, and time/evidence.

- [ ] **Step 4: Run export tests and validate docs**

Run:

```powershell
node --test tests\family-export.test.cjs tests\family-schema.test.cjs
rg -n "version.: 5|familyRelations|familyView|certainty|contextId" "D:\OneDrive\OneDrive - 南方医科大学\桌面\AI project\剧情人物梳理\示例数据\JSON-SPEC.md"
```

Expected: tests PASS and every required term appears.

- [ ] **Step 5: Commit export and documentation**

Stage the project export module/test and the external JSON-SPEC only if that specification directory is part of the intended repository; otherwise record the external update separately and commit project files alone.

## Task 8: Add Performance Benchmarks And Large-Graph Guards

**Files:**
- Create: `tests/family-performance.test.cjs`
- Create: `tests/fixtures/family/generate-large-family.cjs`
- Modify: `src/family/family-layout.js`
- Modify: `src/family/family-renderer.js`
- Modify: `src/family/family-view.js`

- [ ] **Step 1: Add deterministic synthetic generator**

Generate 100/200, 500/1000, and 1000/2000 datasets with fixed seed, multiple unions, disconnected houses, repeated names, and 5% disputed relations. Never commit a multi-megabyte generated JSON; generate in memory during tests.

- [ ] **Step 2: Add benchmark assertions**

Measure schema + index + validator + fallback layout separately. Use generous CI limits and print actual timings:

```js
assert.ok(metrics.indexMs < 250, `index ${metrics.indexMs}ms`);
assert.ok(metrics.layoutMs < 3000, `layout ${metrics.layoutMs}ms`);
assert.equal(metrics.invalidCoordinates, 0);
```

- [ ] **Step 3: Add render and interaction guards**

Batch DOM updates in one animation frame, memoize wrapped names and card metadata, debounce structural slider changes, cancel stale layout requests, limit far-LOD text, and keep selection/search updates to changed node/edge classes.

- [ ] **Step 4: Run all Node tests and benchmarks**

Run: `node --test tests\*.test.cjs`  
Expected: all PASS; benchmark output records all three sizes and zero invalid coordinates.

- [ ] **Step 5: Commit performance guards**

```bash
git add tests/family-performance.test.cjs tests/fixtures/family/generate-large-family.cjs src/family/family-layout.js src/family/family-renderer.js src/family/family-view.js
git commit -m "perf: keep large lineage graphs responsive"
```

## Task 9: Run Browser Functional And Visual QA

**Files:**
- Create: `tests/browser/family-tree-smoke.mjs`
- Create: `tests/fixtures/family/browser-complex-v5.json`
- Modify: family modules and CSS only when QA finds a defect.

- [ ] **Step 1: Create browser fixture**

Include at least 40 people, 12 unions, multiple parentage types, two disputed hypotheses, repeated names, three disconnected houses, one diagnosed cycle, long Chinese names, and one hidden branch.

- [ ] **Step 2: Automate desktop workflow**

Use the approved in-app browser surface to:

1. Load the app and import the fixture.
2. Open 谱系图.
3. Verify node/relation/diagnostic counts.
4. Search exact and fuzzy names.
5. Select a person and assert unrelated coordinates do not change.
6. Toggle certainty, hidden, episode, house mode, focus, collapse, and spacing.
7. Open and edit a multi-party union.
8. Export SVG/PNG and inspect the rendered output.

- [ ] **Step 3: Capture and inspect desktop screenshots**

Capture 1440x900 and 1920x1080 screenshots for full lineage, house mode, focused person, diagnostics, editor, and exported SVG. Inspect every saved image for blank content, clipped panels, crossing labels, unreadable names, toolbar overflow, and inconsistent relation encoding.

- [ ] **Step 4: Capture and inspect mobile screenshots**

At 390x844, verify toolbar wrapping, filter/inspector drawers, 44px targets, focus order, two-line names, and no horizontal page overflow. Test Esc closing hierarchy and trigger focus restoration.

- [ ] **Step 5: Run large-browser performance checks**

Load 500/1000 and 1000/2000 generated datasets. Record import, layout, first render, search, focus, pan/zoom, and filter timings. Use PerformanceObserver and screenshot pixel checks to confirm nonblank output. Fix any long task over 100ms in search/highlight/inspector paths.

- [ ] **Step 6: Commit browser tests and QA fixes**

```bash
git add tests/browser tests/fixtures/family/browser-complex-v5.json src/family styles/family-tree.css index.html
git commit -m "test: cover lineage browser workflows"
```

## Task 10: Remove Legacy Family Tree And Finalize Integration

**Files:**
- Delete: `ft-build.js`
- Delete: `ft-layout.js`
- Delete: `ft-render.js`
- Modify: `index.html`
- Modify: `docs/superpowers/specs/2026-07-14-family-lineage-graph-design.md` only if implementation-specific clarification is required.

- [ ] **Step 1: Remove legacy inline family implementation**

Delete old constants and functions from `initFamilyTree` through `exportFamilyTreePNG`, old CSS, and obsolete markup/listeners. Remove the three unused root files. Keep only the v2 module bootstrap and new workspace markup.

- [ ] **Step 2: Run syntax, duplicate-symbol, and encoding checks**

```powershell
node --check src\family\family-schema.js
node --check src\family\family-index.js
node --check src\family\family-validator.js
node --check src\family\family-layout.js
node --check src\family\family-renderer.js
node --check src\family\family-view.js
rg -n "function buildFamilyData|function layoutFamilyTree|function renderFamilyTree|鍏崇郴|瀹剁郴" index.html src\family
```

Expected: syntax checks pass; no legacy function definitions or mojibake matches.

- [ ] **Step 3: Run complete automated suite**

Run: `node --test tests\*.test.cjs`  
Expected: all tests PASS, including family performance tests.

- [ ] **Step 4: Repeat final browser audit**

Repeat the real v4 Twin Peaks JSON, complex v5 fixture, 500/1000 graph, desktop, and mobile flows after legacy removal. Inspect fresh screenshots rather than relying on earlier captures.

- [ ] **Step 5: Confirm Git scope**

Run `git status --short` and `git diff --stat HEAD~1`. Confirm only family feature, tests, dependency, docs, and required integration files changed. Do not include audit screenshots, downloads, or temporary browser harnesses.

- [ ] **Step 6: Commit final integration**

```bash
git add index.html src/family styles/family-tree.css vendor/elk ft-build.js ft-layout.js ft-render.js
git commit -m "refactor: replace legacy family tree"
```

- [ ] **Step 7: Push the feature branch after verification**

Push `codex/layout-performance-refactor` only after all automated and browser checks pass. Report the commit range, exact test counts, measured performance, screenshot paths, and remaining limitations.

## Plan Self-Review Checklist

- [x] Every approved JSON v5 field maps to Task 1, 6, or 7.
- [x] Multiple unions, parentage variants, kinship, succession, uncertainty, time, evidence, hidden state, and family view settings are covered.
- [x] Layout cycles, disconnected components, house mode, stability, Worker fallback, and finite coordinates are covered.
- [x] Search, selection, focus, folding, diagnostics, editor, export, accessibility, responsive behavior, and performance are covered.
- [x] v4 migration and compatibility export are explicitly tested.
- [x] Legacy code is removed only after v2 browser parity.
