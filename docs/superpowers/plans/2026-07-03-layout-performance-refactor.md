# Force Layout, Performance, And Index Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add force-based viewport return, tag-cluster layout, faster large JSON import/render paths, and split the large `index.html` into maintainable browser modules without changing the no-build workflow.

**Architecture:** Keep `index.html` working as the shell during the whole migration. Extract algorithmic logic into UMD-style modules first, because those can be tested with Node and loaded directly in the browser. Only after behavior is covered by tests should UI/event/data/render code be moved out of `index.html` in small slices.

**Tech Stack:** Plain HTML/CSS/JavaScript, D3 v7 from CDN, Node built-in `node:test`, no bundler, browser smoke tests through Playwright CLI.

---

## File Structure

Create or modify these files:

- Create: `layout-forces.js`
  - Pure force helpers compatible with D3 simulation: viewport boundary repulsion, cluster center calculation, tag target assignment, and temporary force configuration helpers.
- Create: `graph-index.js`
  - Builds reusable lookup maps for nodes, links, degrees, adjacency, link endpoint resolution, and first-episode visibility indices.
- Create: `tests/layout-forces.test.cjs`
  - Unit tests for boundary force behavior and tag cluster target calculation.
- Create: `tests/graph-index.test.cjs`
  - Unit tests for O(N+E) endpoint resolution, degree/adjacency maps, and episode index derivation.
- Create: `src/app-state.js`
  - Initializes and exposes the shared state object and state normalization helpers.
- Create: `src/render-graph.js`
  - Owns D3 graph rendering, simulation setup, tick updates, and graph style application.
- Create: `src/import-export.js`
  - Owns JSON import/export normalization and PNG/SVG/PDF/standalone HTML export handlers.
- Create: `src/ui-panels.js`
  - Owns sidebar tabs, character/tag panels, degree filter panel, clustering controls, and toolbar controls.
- Create: `src/episode-timeline.js`
  - Owns episode parsing, episode list calculation, current episode filtering, and slider UI updates.
- Create: `src/family-tree-view.js`
  - Moves the family-tree overlay code out of `index.html`.
- Modify: `index.html`
  - Load new scripts, add clustering UI controls, replace inline code with module calls, and keep only markup plus bootstrapping.
- Modify: `viewport-tools.js`
  - Keep current clamp helpers, but add an option to return changed nodes and clear fixed positions through a tested helper if that is the smallest compatible change.
- Modify: `degree-filter.js`
  - Export `matchesOperator` and let UI degree filtering use the cached graph index after the index module exists.
- Modify: `tests/degree-filter.test.cjs`
  - Keep existing behavior covered after index delegation.

## Acceptance Criteria

- Clicking `收回当前视野` brings out-of-view nodes back into the viewport interior, releases their fixed positions, applies a temporary boundary repulsion force, and reheats the network so nodes do not pile up on the edge.
- Boundary repulsion is active only during temporary relayout, then removed so the user can continue manual editing normally.
- The display panel contains a tag-category clustering control. Selecting a category and clicking `按标签分群` produces visible clusters by tag, with untagged nodes assigned to a separate fallback cluster.
- The clustering force is one-shot: it reshapes the layout, then releases the graph so ordinary force controls and manual dragging still work.
- Large JSON import uses map-based endpoint resolution and cached graph indices instead of repeated `Array.find` scans.
- Repeated visibility/link-count operations use graph indices where practical.
- `index.html` becomes a shell instead of the primary code container. The project remains runnable by opening/serving the HTML file; no build step is introduced.
- Existing JSON import/export remains backward compatible.
- All existing unit tests pass, plus new tests for layout forces and graph indexing.
- Browser smoke test imports `D:\下载\symposium_relationships_cn.json`, confirms Chinese text is intact, and exercises viewport return plus tag clustering controls.

---

### Task 1: Add Graph Index Tests

**Files:**
- Create: `tests/graph-index.test.cjs`
- Create later: `graph-index.js`

- [ ] **Step 1: Write the failing test**

Create `tests/graph-index.test.cjs` with:

```js
const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildGraphIndex,
  resolveLinkEndpoints,
  firstEpisodeIndex,
} = require('../graph-index.js');

test('resolves link endpoints in O(N+E) style using node ids', () => {
  const nodes = [
    { id: 'N1', name: 'A' },
    { id: 'N2', name: 'B' },
    { id: 'N3', name: 'C' },
  ];
  const links = [
    { id: 'L1', source: 'N1', target: 'N2' },
    { id: 'L2', source: { id: 'N2' }, target: 'N3' },
    { id: 'L3', source: 'N404', target: 'N1' },
  ];

  const resolved = resolveLinkEndpoints(nodes, links);

  assert.equal(resolved.links.length, 2);
  assert.equal(resolved.dropped.length, 1);
  assert.equal(resolved.links[0].source, nodes[0]);
  assert.equal(resolved.links[0].target, nodes[1]);
  assert.equal(resolved.links[1].source, nodes[1]);
  assert.equal(resolved.links[1].target, nodes[2]);
});

test('builds degree and adjacency maps from visible and hidden links', () => {
  const nodes = [{ id: 'N1' }, { id: 'N2' }, { id: 'N3' }];
  const links = [
    { id: 'L1', source: nodes[0], target: nodes[1] },
    { id: 'L2', source: nodes[0], target: nodes[2], hidden: true },
  ];

  const index = buildGraphIndex(nodes, links);

  assert.deepEqual(Object.fromEntries(index.degrees), { N1: 1, N2: 1, N3: 0 });
  assert.deepEqual(index.linksByNodeId.get('N1').map(l => l.id), ['L1']);
  assert.deepEqual(index.linksByNodeIdIncludingHidden.get('N1').map(l => l.id), ['L1', 'L2']);
});

test('calculates first episode indices from a stable episode list', () => {
  const episodeList = [
    { season: 3, episode: 1, sequence: 0 },
    { season: 3, episode: 2, sequence: 0 },
    { season: 3, episode: 2, sequence: 1 },
  ];

  assert.equal(firstEpisodeIndex([{ season: 3, episode: 2, sequence: 1 }], episodeList), 2);
  assert.equal(firstEpisodeIndex([{ season: 4, episode: 1 }], episodeList), Infinity);
  assert.equal(firstEpisodeIndex([], episodeList), Infinity);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test tests\graph-index.test.cjs
```

Expected: FAIL with `Cannot find module '../graph-index.js'`.

---

### Task 2: Implement Graph Index Module

**Files:**
- Create: `graph-index.js`
- Test: `tests/graph-index.test.cjs`

- [ ] **Step 1: Add minimal implementation**

Create `graph-index.js`:

```js
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DramatisGraphIndex = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function endpointId(endpoint) {
    if (!endpoint) return null;
    if (typeof endpoint === 'object') return endpoint.id || null;
    return endpoint;
  }

  function resolveLinkEndpoints(nodes, links) {
    var nodesById = new Map();
    (nodes || []).forEach(function(node) {
      if (node && node.id) nodesById.set(node.id, node);
    });

    var resolved = [];
    var dropped = [];
    (links || []).forEach(function(link) {
      var source = nodesById.get(endpointId(link && link.source));
      var target = nodesById.get(endpointId(link && link.target));
      if (!source || !target) {
        dropped.push(link);
        return;
      }
      link.source = source;
      link.target = target;
      resolved.push(link);
    });

    return { links: resolved, dropped: dropped, nodesById: nodesById };
  }

  function addToMapList(map, key, value) {
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(value);
  }

  function buildGraphIndex(nodes, links) {
    var nodesById = new Map();
    var degrees = new Map();
    var linksByNodeId = new Map();
    var linksByNodeIdIncludingHidden = new Map();

    (nodes || []).forEach(function(node) {
      if (!node || !node.id) return;
      nodesById.set(node.id, node);
      degrees.set(node.id, 0);
      linksByNodeId.set(node.id, []);
      linksByNodeIdIncludingHidden.set(node.id, []);
    });

    (links || []).forEach(function(link) {
      if (!link) return;
      var sourceId = endpointId(link.source);
      var targetId = endpointId(link.target);
      if (!nodesById.has(sourceId) || !nodesById.has(targetId)) return;

      addToMapList(linksByNodeIdIncludingHidden, sourceId, link);
      if (targetId !== sourceId) addToMapList(linksByNodeIdIncludingHidden, targetId, link);

      if (link.hidden) return;
      degrees.set(sourceId, (degrees.get(sourceId) || 0) + 1);
      if (targetId !== sourceId) degrees.set(targetId, (degrees.get(targetId) || 0) + 1);
      addToMapList(linksByNodeId, sourceId, link);
      if (targetId !== sourceId) addToMapList(linksByNodeId, targetId, link);
    });

    return {
      nodesById: nodesById,
      degrees: degrees,
      linksByNodeId: linksByNodeId,
      linksByNodeIdIncludingHidden: linksByNodeIdIncludingHidden,
    };
  }

  function episodeKey(ep) {
    if (!ep) return '';
    return [ep.season, ep.episode, ep.sequence || 0].join('-');
  }

  function firstEpisodeIndex(episodes, episodeList) {
    if (!episodes || !episodes.length) return Infinity;
    var indexByKey = new Map();
    (episodeList || []).forEach(function(ep, index) {
      indexByKey.set(episodeKey(ep), index);
    });

    var min = Infinity;
    episodes.forEach(function(ep) {
      var index = indexByKey.get(episodeKey(ep));
      if (index != null && index < min) min = index;
    });
    return min;
  }

  return {
    buildGraphIndex: buildGraphIndex,
    endpointId: endpointId,
    firstEpisodeIndex: firstEpisodeIndex,
    resolveLinkEndpoints: resolveLinkEndpoints,
  };
});
```

- [ ] **Step 2: Run test to verify it passes**

Run:

```powershell
node --test tests\graph-index.test.cjs
```

Expected: PASS.

---

### Task 3: Add Layout Force Tests

**Files:**
- Create: `tests/layout-forces.test.cjs`
- Create later: `layout-forces.js`

- [ ] **Step 1: Write the failing test**

Create `tests/layout-forces.test.cjs`:

```js
const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildClusterTargets,
  createBoundaryForce,
  createClusterForce,
  distributeClusterCenters,
  pullNodesInsideBounds,
} = require('../layout-forces.js');

test('pulls nodes into viewport interior and clears fixed positions', () => {
  const nodes = [
    { id: 'N1', x: -200, y: 50, fx: -200, fy: 50 },
    { id: 'N2', x: 400, y: 500 },
    { id: 'N3', x: 120, y: 130, fx: 120, fy: 130 },
  ];

  const changed = pullNodesInsideBounds(nodes, {
    minX: 0,
    maxX: 300,
    minY: 0,
    maxY: 300,
  }, 40);

  assert.equal(changed, 2);
  assert.deepEqual(nodes.map(n => [n.x, n.y, n.fx, n.fy]), [
    [40, 50, null, null],
    [260, 260, null, null],
    [120, 130, 120, 130],
  ]);
});

test('boundary force pushes nodes away from viewport edges', () => {
  const nodes = [
    { id: 'N1', x: 5, y: 150, vx: 0, vy: 0 },
    { id: 'N2', x: 295, y: 150, vx: 0, vy: 0 },
    { id: 'N3', x: 150, y: 10, vx: 0, vy: 0 },
  ];
  const force = createBoundaryForce(() => ({
    minX: 0,
    maxX: 300,
    minY: 0,
    maxY: 300,
  }), { margin: 40, strength: 0.2 });

  force.initialize(nodes);
  force(1);

  assert.ok(nodes[0].vx > 0);
  assert.ok(nodes[1].vx < 0);
  assert.ok(nodes[2].vy > 0);
});

test('distributes cluster centers around the visible canvas', () => {
  const centers = distributeClusterCenters(['A', 'B', 'C'], {
    minX: 0,
    maxX: 600,
    minY: 0,
    maxY: 400,
  });

  assert.equal(centers.size, 3);
  assert.ok(centers.get('A').x >= 80);
  assert.ok(centers.get('A').x <= 520);
  assert.ok(centers.get('A').y >= 80);
  assert.ok(centers.get('A').y <= 320);
});

test('assigns nodes to tag cluster targets with an untagged fallback', () => {
  const category = {
    id: 'C2',
    tags: [
      { id: 'T1', name: 'Case' },
      { id: 'T2', name: 'Town' },
    ],
  };
  const nodes = [
    { id: 'N1', tags: { C2: 'T1' } },
    { id: 'N2', tags: { C2: 'T2' } },
    { id: 'N3', tags: {} },
  ];

  const targets = buildClusterTargets(nodes, category, {
    minX: 0,
    maxX: 600,
    minY: 0,
    maxY: 400,
  });

  assert.equal(targets.nodeTargets.get('N1').label, 'Case');
  assert.equal(targets.nodeTargets.get('N2').label, 'Town');
  assert.equal(targets.nodeTargets.get('N3').label, '未分类');
  assert.equal(targets.clusterCenters.size, 3);
});

test('cluster force pulls node velocity toward assigned center', () => {
  const nodes = [{ id: 'N1', x: 0, y: 0, vx: 0, vy: 0 }];
  const targets = new Map([
    ['N1', { x: 100, y: 50, label: 'A' }],
  ]);
  const force = createClusterForce(targets, { strength: 0.1 });

  force.initialize(nodes);
  force(1);

  assert.ok(nodes[0].vx > 0);
  assert.ok(nodes[0].vy > 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test tests\layout-forces.test.cjs
```

Expected: FAIL with `Cannot find module '../layout-forces.js'`.

---

### Task 4: Implement Layout Force Module

**Files:**
- Create: `layout-forces.js`
- Test: `tests/layout-forces.test.cjs`

- [ ] **Step 1: Add minimal implementation**

Create `layout-forces.js`:

```js
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DramatisLayoutForces = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function pullNodesInsideBounds(nodes, bounds, padding) {
    var pad = Math.max(0, Number(padding) || 0);
    var changed = 0;
    (nodes || []).forEach(function(node) {
      if (!node) return;
      var x = Number.isFinite(node.x) ? node.x : 0;
      var y = Number.isFinite(node.y) ? node.y : 0;
      var nextX = clamp(x, bounds.minX + pad, bounds.maxX - pad);
      var nextY = clamp(y, bounds.minY + pad, bounds.maxY - pad);
      if (nextX !== x || nextY !== y) {
        changed += 1;
        node.x = nextX;
        node.y = nextY;
        node.fx = null;
        node.fy = null;
      }
    });
    return changed;
  }

  function createBoundaryForce(boundsProvider, options) {
    var nodes = [];
    var opts = options || {};
    var margin = Math.max(1, Number(opts.margin) || 80);
    var strength = Math.max(0, Number(opts.strength) || 0.08);

    function force(alpha) {
      var bounds = boundsProvider();
      nodes.forEach(function(node) {
        if (!node) return;
        var left = node.x - bounds.minX;
        var right = bounds.maxX - node.x;
        var top = node.y - bounds.minY;
        var bottom = bounds.maxY - node.y;

        if (left < margin) node.vx += (margin - left) * strength * alpha;
        if (right < margin) node.vx -= (margin - right) * strength * alpha;
        if (top < margin) node.vy += (margin - top) * strength * alpha;
        if (bottom < margin) node.vy -= (margin - bottom) * strength * alpha;
      });
    }

    force.initialize = function(nextNodes) {
      nodes = nextNodes || [];
    };

    return force;
  }

  function distributeClusterCenters(keys, bounds) {
    var ids = Array.from(keys || []);
    var centers = new Map();
    if (!ids.length) return centers;

    var width = Math.max(1, bounds.maxX - bounds.minX);
    var height = Math.max(1, bounds.maxY - bounds.minY);
    var radiusX = Math.max(80, width * 0.34);
    var radiusY = Math.max(80, height * 0.30);
    var cx = bounds.minX + width / 2;
    var cy = bounds.minY + height / 2;

    ids.forEach(function(id, index) {
      var angle = -Math.PI / 2 + index * Math.PI * 2 / ids.length;
      centers.set(id, {
        x: cx + Math.cos(angle) * radiusX,
        y: cy + Math.sin(angle) * radiusY,
      });
    });
    return centers;
  }

  function buildClusterTargets(nodes, category, bounds) {
    var tags = (category && category.tags) || [];
    var tagById = new Map();
    tags.forEach(function(tag) {
      if (tag && tag.id) tagById.set(tag.id, tag);
    });

    var clusterKeys = [];
    var nodeClusterKey = new Map();
    (nodes || []).forEach(function(node) {
      var tagId = node && node.tags ? node.tags[category.id] : null;
      var tag = tagById.get(tagId);
      var key = tag ? tag.id : '__untagged__';
      if (!clusterKeys.includes(key)) clusterKeys.push(key);
      if (node && node.id) nodeClusterKey.set(node.id, key);
    });

    var clusterCenters = distributeClusterCenters(clusterKeys, bounds);
    var nodeTargets = new Map();
    (nodes || []).forEach(function(node) {
      if (!node || !node.id) return;
      var key = nodeClusterKey.get(node.id);
      var center = clusterCenters.get(key);
      var tag = tagById.get(key);
      nodeTargets.set(node.id, {
        x: center.x,
        y: center.y,
        label: tag ? tag.name : '未分类',
        clusterKey: key,
      });
    });

    return {
      clusterCenters: clusterCenters,
      nodeTargets: nodeTargets,
    };
  }

  function createClusterForce(nodeTargets, options) {
    var nodes = [];
    var opts = options || {};
    var strength = Math.max(0, Number(opts.strength) || 0.08);

    function force(alpha) {
      nodes.forEach(function(node) {
        if (!node || !node.id) return;
        var target = nodeTargets.get(node.id);
        if (!target) return;
        node.vx += (target.x - node.x) * strength * alpha;
        node.vy += (target.y - node.y) * strength * alpha;
      });
    }

    force.initialize = function(nextNodes) {
      nodes = nextNodes || [];
    };

    return force;
  }

  return {
    buildClusterTargets: buildClusterTargets,
    createBoundaryForce: createBoundaryForce,
    createClusterForce: createClusterForce,
    distributeClusterCenters: distributeClusterCenters,
    pullNodesInsideBounds: pullNodesInsideBounds,
  };
});
```

- [ ] **Step 2: Run test to verify it passes**

Run:

```powershell
node --test tests\layout-forces.test.cjs
```

Expected: PASS.

---

### Task 5: Integrate Fast Graph Index Into Import And Common Lookups

**Files:**
- Modify: `index.html`
- Modify: `degree-filter.js`
- Modify: `tests/degree-filter.test.cjs`
- Test: `tests/graph-index.test.cjs`

- [ ] **Step 1: Add script loading**

In `index.html`, after the D3 script and before existing helper scripts, add:

```html
<script src="graph-index.js"></script>
<script src="layout-forces.js"></script>
```

- [ ] **Step 2: Add state index cache**

Near the `state` declaration in `index.html`, add an index cache field:

```js
graphIndex: null,
```

Add helper functions near `normalizeGraphStyle`:

```js
function rebuildGraphIndex() {
  if (!window.DramatisGraphIndex) return null;
  state.graphIndex = DramatisGraphIndex.buildGraphIndex(state.nodes, state.links);
  return state.graphIndex;
}

function currentGraphIndex() {
  return state.graphIndex || rebuildGraphIndex();
}
```

- [ ] **Step 3: Replace import endpoint resolution**

In the JSON import handler around `state.links.forEach(l => { ...find... })`, replace the repeated `find` endpoint resolution with:

```js
if (window.DramatisGraphIndex) {
  const resolved = DramatisGraphIndex.resolveLinkEndpoints(state.nodes, state.links);
  state.links = resolved.links;
} else {
  state.links.forEach(l => {
    if (typeof l.source === 'string') l.source = state.nodes.find(n => n.id === l.source);
    if (typeof l.target === 'string') l.target = state.nodes.find(n => n.id === l.target);
  });
  state.links = state.links.filter(l => l.source && l.target);
}
rebuildGraphIndex();
```

- [ ] **Step 4: Rebuild index after mutations**

Call `rebuildGraphIndex()` after changes that add, delete, hide, or show nodes/links:

```js
rebuildGraphIndex();
render(true);
```

Apply this to `deleteNode`, `deleteLink`, relation save/delete, character save/delete, batch hide/show, degree hide/show, import, clear, and show-all.

- [ ] **Step 5: Update degree filter to use cache when available**

In `degreeFilterMatches()`, prefer cached degrees:

```js
const index = currentGraphIndex();
if (index && index.degrees) {
  const controls = degreeFilterControls();
  return state.nodes.filter(node => {
    const degree = index.degrees.get(node.id) || 0;
    if (!window.DramatisDegreeFilter) return false;
    return DramatisDegreeFilter.matchesOperator
      ? DramatisDegreeFilter.matchesOperator(degree, controls.operator, controls.threshold)
      : DramatisDegreeFilter.getNodesMatchingDegree([node], state.links, controls.operator, controls.threshold).length > 0;
  });
}
```

Also export `matchesOperator` from `degree-filter.js`:

```js
return {
  calculateNodeDegrees: calculateNodeDegrees,
  getNodesMatchingDegree: getNodesMatchingDegree,
  matchesOperator: matchesOperator,
};
```

- [ ] **Step 6: Run tests**

Run:

```powershell
node --test tests\degree-filter.test.cjs tests\graph-index.test.cjs
```

Expected: PASS.

---

### Task 6: Integrate Viewport Return With Boundary Repulsion

**Files:**
- Modify: `index.html`
- Test: `tests/layout-forces.test.cjs`

- [ ] **Step 1: Replace simple clamp action**

Replace the body of `clampAllNodesToCurrentViewport()` with behavior equivalent to:

```js
function graphViewportBounds(padding) {
  const t = currentTransform();
  const s = getSize();
  if (window.DramatisViewportTools) {
    return DramatisViewportTools.viewportBounds(t, s, padding || 0);
  }
  return { minX: 0, maxX: s.width, minY: 0, maxY: s.height };
}

function scheduleTemporaryForce(name, force, durationMs) {
  simulation.force(name, force);
  simulation.alphaTarget(0.18).alpha(0.85).restart();
  window.setTimeout(() => {
    simulation.force(name, null);
    simulation.alphaTarget(0);
  }, durationMs || 1800);
}

function clampAllNodesToCurrentViewport() {
  if (!window.DramatisLayoutForces || state.nodes.length === 0) return;
  pushUndo();
  const bounds = graphViewportBounds(64);
  const changed = DramatisLayoutForces.pullNodesInsideBounds(state.nodes, bounds, 48);
  const boundaryForce = DramatisLayoutForces.createBoundaryForce(
    () => graphViewportBounds(0),
    { margin: Math.max(90, NODE_R * 3), strength: 0.06 }
  );
  scheduleTemporaryForce('viewportBoundary', boundaryForce, 2200);
  render(false);

  const status = document.getElementById('viewport-clamp-summary');
  if (status) status.textContent = changed > 0
    ? `已收回 ${changed} 个节点，并重新松弛布局`
    : '所有节点已在视野内，正在重新松弛布局';
}
```

- [ ] **Step 2: Verify behavior manually in browser**

Run a local server:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/index.html`, import a dense JSON file, drag several nodes outside view, click `收回当前视野`.

Expected:

- Out-of-view nodes return inside the visible bounds.
- Nodes do not remain pinned to the viewport edge.
- The network visibly relaxes for about two seconds.
- Manual dragging still works after relaxation.

---

### Task 7: Add Tag Cluster UI And One-Shot Cluster Force

**Files:**
- Modify: `index.html`
- Test: `tests/layout-forces.test.cjs`

- [ ] **Step 1: Add controls to display cleanup panel**

Inside the `网络清理 · Cleanup` panel, under the viewport clamp button, add:

```html
<div class="field-row" style="gap:6px;align-items:center;margin-top:8px">
  <select id="cluster-category-select" style="flex:1;background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-primary);padding:6px 6px;border-radius:4px;font-size:12px;outline:none"></select>
  <button class="btn btn-secondary btn-small" id="btn-cluster-by-tag" style="flex:0 0 auto">按标签分群</button>
</div>
<div id="cluster-layout-summary" class="hint-text" style="margin-top:6px"></div>
```

- [ ] **Step 2: Render category options**

Add:

```js
function updateClusterCategoryOptions() {
  const select = document.getElementById('cluster-category-select');
  if (!select) return;
  const current = select.value;
  select.innerHTML = '';
  state.tagCategories
    .filter(category => category && category.tags && category.tags.length)
    .forEach(category => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name || category.id;
      select.appendChild(option);
    });
  if (current && Array.from(select.options).some(option => option.value === current)) {
    select.value = current;
  }
}
```

Call `updateClusterCategoryOptions()` from `renderUI()` after `renderTagCategoriesPanel()`.

- [ ] **Step 3: Add cluster action**

Add:

```js
function clusterBySelectedTagCategory() {
  if (!window.DramatisLayoutForces || state.nodes.length === 0) return;
  const select = document.getElementById('cluster-category-select');
  const summary = document.getElementById('cluster-layout-summary');
  const categoryId = select && select.value;
  const category = state.tagCategories.find(c => c.id === categoryId);
  if (!category) {
    if (summary) summary.textContent = '请先选择一个标签分类';
    return;
  }

  pushUndo();
  const visibleNodes = state.nodes.filter(isNodeVisible);
  const targets = DramatisLayoutForces.buildClusterTargets(
    visibleNodes,
    category,
    graphViewportBounds(96)
  );
  const clusterForce = DramatisLayoutForces.createClusterForce(
    targets.nodeTargets,
    { strength: 0.10 }
  );
  const boundaryForce = DramatisLayoutForces.createBoundaryForce(
    () => graphViewportBounds(0),
    { margin: Math.max(90, NODE_R * 3), strength: 0.04 }
  );

  visibleNodes.forEach(node => {
    node.fx = null;
    node.fy = null;
  });

  scheduleTemporaryForce('tagCluster', clusterForce, 2600);
  scheduleTemporaryForce('clusterBoundary', boundaryForce, 2600);
  render(false);

  if (summary) {
    summary.textContent = `按「${category.name || category.id}」生成 ${targets.clusterCenters.size} 个分群`;
  }
}
```

Bind the button:

```js
document.getElementById('btn-cluster-by-tag').addEventListener('click', clusterBySelectedTagCategory);
```

- [ ] **Step 4: Run tests**

Run:

```powershell
node --test tests\layout-forces.test.cjs
```

Expected: PASS.

---

### Task 8: Add Performance Smoke Test For Large Graph Operations

**Files:**
- Create: `tests/performance-smoke.test.cjs`
- Test: `graph-index.js`

- [ ] **Step 1: Write benchmark-style correctness test**

Create `tests/performance-smoke.test.cjs`:

```js
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
```

- [ ] **Step 2: Run test**

Run:

```powershell
node --test tests\performance-smoke.test.cjs
```

Expected: PASS on the current development machine. If it fails slightly because of machine load, inspect the elapsed time and optimize map construction before raising the threshold.

---

### Task 9: Split State And Data Modules Out Of `index.html`

**Files:**
- Create: `src/app-state.js`
- Create: `src/episode-timeline.js`
- Modify: `index.html`

- [ ] **Step 1: Create state module**

Create `src/app-state.js` as a browser global module:

```js
(function(root) {
  function createInitialState() {
    return {
      nodes: [],
      links: [],
      tagCategories: [],
      linkMode: false,
      linkFrom: null,
      nextId: 1,
      editing: null,
      selectedNodes: new Set(),
      currentEpisode: null,
      episodeList: [],
      episodeSequence: 0,
      mode: 'organize',
      freePlacement: false,
      graphBackgroundColor: '#0d0e12',
      graphStyle: {
        nodeLabelColor: '#e8e4d6',
        nodeLabelFontSize: 13,
        nodeScale: 1.0,
        nodeLabelOpacity: 1.0,
        nodeLabelPlacement: 'outside',
      },
      linkTypes: {
        relation: {
          label: '关系',
          color: '#4a5068',
          width: 1.5,
          dasharray: '',
          labelColor: '#8a8e9f',
          directed: false,
          labelFontSize: 11,
          labelOrientation: 'horizontal',
        },
        action: {
          label: '行动',
          color: '#4a5068',
          width: 1.5,
          dasharray: '',
          labelColor: '#8a8e9f',
          directed: true,
          labelFontSize: 11,
          labelOrientation: 'horizontal',
        },
      },
      characterSort: { by: 'creation', order: 'asc' },
      graphIndex: null,
      _pendingLinkFrom: null,
      forceConfig: {
        centerStrength: 0.05,
        chargeStrength: -650,
        linkStrength: 0.5,
        linkDistance: 170,
      },
    };
  }

  function normalizeNodeLabelPlacement(value) {
    if (root.DramatisNodeLabelLayout && root.DramatisNodeLabelLayout.normalizeNodeLabelPlacement) {
      return root.DramatisNodeLabelLayout.normalizeNodeLabelPlacement(value);
    }
    return value === 'inside' ? 'inside' : 'outside';
  }

  function normalizeGraphStyle(style) {
    var gs = Object.assign({}, style || {});
    if (!gs.nodeLabelColor) gs.nodeLabelColor = '#e8e4d6';
    if (gs.nodeLabelFontSize == null) gs.nodeLabelFontSize = 13;
    if (gs.nodeScale == null) gs.nodeScale = 1.0;
    if (gs.nodeLabelOpacity == null) gs.nodeLabelOpacity = 1.0;
    gs.nodeLabelPlacement = normalizeNodeLabelPlacement(gs.nodeLabelPlacement);
    return gs;
  }

  root.DramatisAppState = {
    createInitialState: createInitialState,
    normalizeGraphStyle: normalizeGraphStyle,
    normalizeNodeLabelPlacement: normalizeNodeLabelPlacement,
  };
})(window);
```

- [ ] **Step 2: Load state module**

Add script tag before main inline script:

```html
<script src="src/app-state.js"></script>
```

In `index.html`, replace the inline `const state = { ... }` object with:

```js
const state = DramatisAppState.createInitialState();
```

Keep existing function names working by replacing inline `normalizeGraphStyle` and `normalizeNodeLabelPlacement` with wrappers:

```js
function normalizeGraphStyle(style) {
  return DramatisAppState.normalizeGraphStyle(style);
}

function normalizeNodeLabelPlacement(value) {
  return DramatisAppState.normalizeNodeLabelPlacement(value);
}
```

- [ ] **Step 3: Run syntax and existing tests**

Run:

```powershell
node --test tests\degree-filter.test.cjs tests\viewport-tools.test.cjs tests\toolbar-visibility.test.cjs tests\node-label-layout.test.cjs tests\graph-index.test.cjs tests\layout-forces.test.cjs
```

Expected: PASS.

Run inline script syntax check:

```powershell
@'
const fs=require('fs'); const vm=require('vm');
const html=fs.readFileSync('index.html','utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
new vm.Script(scripts[scripts.length-1], {filename:'inline-main.js'});
console.log('inline main ok');
'@ | node -
```

Expected: `inline main ok`.

---

### Task 10: Split Rendering And UI In Small Vertical Slices

**Files:**
- Create: `src/render-graph.js`
- Create: `src/ui-panels.js`
- Create: `src/import-export.js`
- Create: `src/family-tree-view.js`
- Modify: `index.html`

- [ ] **Step 1: Extract only graph rendering first**

Move these functions and constants to `src/render-graph.js`:

- D3 selections for `#graph-svg`, `#viewport`, `#links-layer`, `#nodes-layer`
- `getSize`
- `currentTransform`
- `computeLinkCurvatures`
- `updateNodeScale`
- `computeNodeRingSegments`
- `ringSegmentPath`
- `render`
- `tick`
- `applyGraphStyles`
- `applyForceConfig`
- `fitView`

Expose them as:

```js
window.DramatisRenderGraph = {
  applyForceConfig,
  applyGraphStyles,
  currentTransform,
  fitView,
  getSize,
  render,
  simulation,
  updateNodeScale,
};
```

In `index.html`, keep compatibility wrappers:

```js
function render(restartSimulation) {
  return DramatisRenderGraph.render(restartSimulation);
}
```

Use wrappers for every extracted public function so later tasks can keep moving code without changing all call sites at once.

- [ ] **Step 2: Verify graph still renders**

Run the browser smoke test from Task 12 after this extraction before moving more code.

- [ ] **Step 3: Extract import/export**

Move JSON import/export, PNG/SVG/PDF export, and standalone HTML export functions to `src/import-export.js`.

Expose:

```js
window.DramatisImportExport = {
  bindImportExportControls,
  buildExportSVG,
  exportToHTML,
};
```

Call from `index.html` after all modules are loaded:

```js
DramatisImportExport.bindImportExportControls({
  state,
  render,
  fitView,
  rebuildGraphIndex,
  normalizeGraphStyle,
});
```

- [ ] **Step 4: Extract family tree**

Move family-tree constants and functions from `initFamilyTree` through `exportFamilyTreePNG` to `src/family-tree-view.js`.

Expose:

```js
window.DramatisFamilyTreeView = {
  bindFamilyTreeControls,
  openFamilyTree,
};
```

- [ ] **Step 5: Extract UI panel binding**

Move tab handling, display panel controls, degree filter controls, cluster controls, toolbar visibility, and force sliders to `src/ui-panels.js`.

Expose:

```js
window.DramatisUIPanels = {
  bindPanelControls,
  renderUI,
  updateClusterCategoryOptions,
};
```

- [ ] **Step 6: Keep `index.html` as boot shell**

After extractions, `index.html` should contain:

- Markup
- Styles
- Script tags
- A short bootstrap block that creates `state`, binds modules, and calls `render(true)`

The final bootstrap should look like:

```js
const state = DramatisAppState.createInitialState();
DramatisBootstrap.start({ state });
```

If `DramatisBootstrap` is not created in this task, keep the current bootstrap wrappers and defer a bootstrap module to the next cleanup pass.

---

### Task 11: Preserve And Improve Standalone HTML Export

**Files:**
- Modify: `src/import-export.js`
- Modify: `index.html`

- [ ] **Step 1: Decide standalone export strategy**

Use this concrete strategy:

- Keep standalone export self-contained.
- Inject the exported graph data and a compact viewer script.
- Include support for `graphStyle.nodeLabelPlacement`.
- Do not include editing controls in the standalone export.

- [ ] **Step 2: Update exported viewer script**

In the standalone export code, add internal helpers matching the main app:

```js
function normalizeNodeLabelPlacement(value) {
  return value === 'inside' ? 'inside' : 'outside';
}

function wrapNodeLabel(label, maxChars, maxLines) {
  var text = String(label || '').replace(/\s+/g, ' ').trim();
  if (!text) return ['?'];
  var lines = [];
  for (var i = 0; i < text.length && lines.length < maxLines; i += maxChars) {
    lines.push(text.slice(i, i + maxChars));
  }
  if (text.length > maxChars * maxLines) {
    var last = lines[lines.length - 1] || '';
    lines[lines.length - 1] = last.length <= 3 ? '...' : last.slice(0, Math.max(0, maxChars - 3)) + '...';
  }
  return lines;
}
```

Use this when rendering `text.node-label` if `graphStyle.nodeLabelPlacement === 'inside'`.

- [ ] **Step 3: Export and smoke test**

Open the main app in browser, import `D:\下载\symposium_relationships_cn.json`, toggle node names inside, export standalone HTML, then open the exported file.

Expected:

- Chinese remains intact.
- Node names display inside circles in exported viewer.
- No script errors.

---

### Task 12: Browser Smoke Verification

**Files:**
- No production file changes.

- [ ] **Step 1: Run unit tests**

Run:

```powershell
node --test tests\degree-filter.test.cjs tests\viewport-tools.test.cjs tests\toolbar-visibility.test.cjs tests\node-label-layout.test.cjs tests\graph-index.test.cjs tests\layout-forces.test.cjs tests\performance-smoke.test.cjs
```

Expected: all tests pass.

- [ ] **Step 2: Run syntax check**

Run:

```powershell
@'
const fs=require('fs'); const vm=require('vm');
const html=fs.readFileSync('index.html','utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
new vm.Script(scripts[scripts.length-1], {filename:'inline-main.js'});
console.log('inline main ok');
'@ | node -
```

Expected: `inline main ok`.

- [ ] **Step 3: Run Playwright import smoke**

Start a local server and use Playwright CLI to import:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Browser actions:

1. Open `http://127.0.0.1:8765/index.html`.
2. Import `D:\下载\symposium_relationships_cn.json`.
3. Confirm imported counts are `103` nodes and `173` links.
4. Confirm body text contains `人物`, `关系`, `标签`, and `网络清理`.
5. Confirm body text does not contain `浜虹墿`, `鍏崇郴`, `闅愯棌`, or `鏄剧ず`.
6. Toggle node names inside circles and verify visible labels still fit.
7. Click `收回当前视野` and verify the status text reports relayout.
8. Select a tag category and click `按标签分群`.
9. Verify the cluster summary reports at least two groups.
10. Press `T`, verify the toolbar hides, then restore it.

Expected: no page errors, no mojibake, all interactions work.

---

## Implementation Order

Use this order and do not combine distant tasks:

1. Graph index tests and module.
2. Layout force tests and module.
3. Integrate index into import and common lookups.
4. Integrate viewport return and tag clustering UI.
5. Add performance smoke test.
6. Run full browser smoke test while `index.html` is still mostly intact.
7. Extract state module.
8. Extract graph render module.
9. Extract import/export module.
10. Extract family tree module.
11. Extract UI panels module.
12. Update standalone HTML export.
13. Run final unit, syntax, and browser smoke tests.

This order keeps feature behavior testable before the risky refactor phase.

## Risk Controls

- Do not rewrite rendering and feature behavior in the same commit.
- Keep script tags in dependency order: D3, pure helpers, state, render, UI/import modules, bootstrap.
- Keep old wrappers temporarily after extraction so call sites can be migrated gradually.
- After each extraction, run at least the syntax check and import smoke before extracting the next section.
- Do not introduce a build step unless the user explicitly approves it later.

## Self-Review

- Requirements coverage:
  - Force-based viewport return: Tasks 3, 4, 6, and 12.
  - Tag clustering layout: Tasks 3, 4, 7, and 12.
  - Faster dense JSON import/runtime: Tasks 1, 2, 5, 8, and 12.
  - Split `index.html`: Tasks 9, 10, and 11.
- No incomplete fields remain in this plan.
- Function names are consistent across modules: `DramatisGraphIndex`, `DramatisLayoutForces`, `DramatisAppState`, `DramatisRenderGraph`, `DramatisImportExport`, `DramatisUIPanels`, and `DramatisFamilyTreeView`.
- The plan keeps the current no-build architecture and direct browser loading model intact.
