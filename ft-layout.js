function layoutFamilyTree(fmap) {
  var NODE_W = 110, NODE_H = 56, COUPLE_GAP = 24, UNIT_GAP = 50, SIBLING_GAP = 28, V_GAP = 110;
  var ids = Object.keys(fmap);

  /* ---- STEP 1: 世代分配（三轮迭代） ---- */
  var gen = {};
  ids.forEach(function(id) { gen[id] = 0; });

  // 上行
  var changed = true, guard = 0;
  while (changed && guard++ < 200) {
    changed = false;
    ids.forEach(function(id) {
      var want = gen[id];
      fmap[id].adj.parents.forEach(function(p) { var g = gen[p] + 1; if (g > want) want = g; });
      fmap[id].adj.spouses.forEach(function(s) { var g = gen[s]; if (g > want) want = g; });
      if (want !== gen[id]) { gen[id] = want; changed = true; }
    });
  }
  // 下行：无父辈节点拉近到子代上方
  changed = true; guard = 0;
  while (changed && guard++ < 200) {
    changed = false;
    ids.forEach(function(id) {
      if (fmap[id].adj.parents.size > 0) return;
      var target = Infinity;
      fmap[id].adj.children.forEach(function(c) { target = Math.min(target, gen[c] - 1); });
      fmap[id].adj.spouses.forEach(function(s) {
        if (fmap[s] && fmap[s].adj.parents.size > 0) target = gen[s];
      });
      if (target !== Infinity && gen[id] < target) { gen[id] = target; changed = true; }
    });
    // 配偶传播
    ids.forEach(function(id) {
      fmap[id].adj.spouses.forEach(function(s) {
        if (gen[s] !== gen[id]) {
          var cap = Infinity;
          fmap[id].adj.children.forEach(function(c) { cap = Math.min(cap, gen[c] - 1); });
          fmap[s].adj.children.forEach(function(c) { cap = Math.min(cap, gen[c] - 1); });
          var want = Math.min(Math.max(gen[id], gen[s]), cap);
          [id, s].forEach(function(x) {
            var lower = -Infinity;
            fmap[x].adj.parents.forEach(function(p) { lower = Math.max(lower, gen[p] + 1); });
            if (want >= lower && gen[x] < want) { gen[x] = want; changed = true; }
          });
        }
      });
    });
  }
  // 最终上行校验
  changed = true; guard = 0;
  while (changed && guard++ < 200) {
    changed = false;
    ids.forEach(function(id) {
      var want = gen[id];
      fmap[id].adj.parents.forEach(function(p) { var g = gen[p] + 1; if (g > want) want = g; });
      fmap[id].adj.spouses.forEach(function(s) { var g = gen[s]; if (g > want) want = g; });
      if (want !== gen[id]) { gen[id] = want; changed = true; }
    });
  }
  var minG = Math.min.apply(null, Object.values(gen));
  ids.forEach(function(id) { gen[id] -= minG; });

  /* ---- STEP 2: 配偶配对 ---- */
  var coupleOf = {};
  ids.forEach(function(id) {
    if (coupleOf[id]) return;
    var spouseList = Array.from(fmap[id].adj.spouses).filter(function(sid) { return gen[sid] === gen[id] && !coupleOf[sid]; });
    if (spouseList.length) {
      coupleOf[id] = spouseList[0];
      coupleOf[spouseList[0]] = id;
    }
  });

  /* ---- STEP 3: 构建 unit 树 ---- */
  var unitOf = {};
  var allUnits = [];
  ids.forEach(function(id) {
    if (unitOf[id]) return;
    var partner = coupleOf[id];
    var u;
    if (partner && !unitOf[partner]) {
      var a = fmap[id].node, b = fmap[partner].node;
      var leftId, rightId;
      if (a.gender === 'male' && b.gender === 'female') { leftId = a.id; rightId = b.id; }
      else if (a.gender === 'female' && b.gender === 'male') { leftId = b.id; rightId = a.id; }
      else { leftId = a.id; rightId = b.id; }
      u = { ids: [leftId, rightId], gen: gen[id] };
      unitOf[leftId] = u; unitOf[rightId] = u;
    } else {
      u = { ids: [id], gen: gen[id] };
      unitOf[id] = u;
    }
    allUnits.push(u);
  });

  allUnits.forEach(function(u) { u.childUnits = []; u.parentUnit = null; });
  allUnits.forEach(function(u) {
    var candidates = u.ids.length === 1 ? [u.ids[0]] : [u.ids[0], u.ids[1]];
    var best = null, bestCount = 0;
    for (var ci = 0; ci < candidates.length; ci++) {
      var cid = candidates[ci];
      var parents = Array.from(fmap[cid].adj.parents);
      if (parents.length === 0) continue;
      var counts = {};
      parents.forEach(function(p) {
        var pu = unitOf[p];
        if (pu === u) return;
        var k = pu.ids.join(',');
        counts[k] = (counts[k] || 0) + 1;
        if (counts[k] > bestCount) { best = pu; bestCount = counts[k]; }
      });
      if (best) break;
    }
    if (best) { u.parentUnit = best; best.childUnits.push(u); }
  });

  var rootUnits = allUnits.filter(function(u) { return !u.parentUnit; });
  rootUnits.sort(function(a, b) { return a.gen - b.gen; });

  /* ---- STEP 4: subtreeWidth ---- */
  function unitWidth(u) { return u.ids.length === 1 ? NODE_W : (2 * NODE_W + COUPLE_GAP); }
  function computeSubtreeWidth(u) {
    var ownW = unitWidth(u);
    if (u.childUnits.length === 0) { u.subtreeWidth = ownW; return ownW; }
    var cw = 0;
    for (var i = 0; i < u.childUnits.length; i++) cw += computeSubtreeWidth(u.childUnits[i]);
    cw += (u.childUnits.length - 1) * SIBLING_GAP;
    u.subtreeWidth = Math.max(ownW, cw);
    return u.subtreeWidth;
  }
  rootUnits.forEach(computeSubtreeWidth);

  /* ---- STEP 5: bloodOffset ---- */
  function getParents(id) { return Array.from(fmap[id].adj.parents); }
  function bloodOffset(u) {
    if (u.ids.length === 1 || !u.parentUnit) return 0;
    for (var i = 0; i < u.ids.length; i++) {
      var parents = getParents(u.ids[i]);
      if (parents.some(function(p) { return u.parentUnit.ids.indexOf(p) >= 0; })) {
        var half = (NODE_W + COUPLE_GAP) / 2;
        return i === 0 ? -half : half;
      }
    }
    return 0;
  }

  /* ---- STEP 6: 分配 X ---- */
  function assignX(u, leftEdge) {
    if (u.childUnits.length === 0) { u.centerX = leftEdge + unitWidth(u) / 2; return; }
    var cw = 0;
    for (var i = 0; i < u.childUnits.length; i++) cw += u.childUnits[i].subtreeWidth;
    cw += (u.childUnits.length - 1) * SIBLING_GAP;
    var cursor = leftEdge + (u.subtreeWidth - cw) / 2;
    for (var i = 0; i < u.childUnits.length; i++) {
      assignX(u.childUnits[i], cursor);
      cursor += u.childUnits[i].subtreeWidth + SIBLING_GAP;
    }
    var attachXs = u.childUnits.map(function(c) { return c.centerX + bloodOffset(c); });
    u.centerX = (Math.min.apply(null, attachXs) + Math.max.apply(null, attachXs)) / 2;
  }
  var rootCursor = 0;
  rootUnits.forEach(function(r) { assignX(r, rootCursor); rootCursor += r.subtreeWidth + UNIT_GAP; });

  /* ---- STEP 7: 同代防重叠 ---- */
  var unitsByGen = {};
  allUnits.forEach(function(u) {
    if (!unitsByGen[u.gen]) unitsByGen[u.gen] = [];
    unitsByGen[u.gen].push(u);
  });
  for (var pass = 0; pass < 10; pass++) {
    var didShift = false;
    Object.keys(unitsByGen).forEach(function(g) {
      var gUnits = unitsByGen[g];
      gUnits.sort(function(a, b) { return a.centerX - b.centerX; });
      for (var i = 1; i < gUnits.length; i++) {
        var prev = gUnits[i - 1], cur = gUnits[i];
        var minGap = (unitWidth(prev) + unitWidth(cur)) / 2 + UNIT_GAP;
        var dx = cur.centerX - prev.centerX;
        if (dx < minGap) {
          var need = minGap - dx;
          (function shiftAll(u) { u.centerX += need; u.childUnits.forEach(shiftAll); })(cur);
          didShift = true;
        }
      }
    });
    if (!didShift) break;
  }

  /* ---- STEP 8: 计算 X, Y ---- */
  var X = {}, Y = {};
  allUnits.forEach(function(u) {
    if (u.ids.length === 1) {
      X[u.ids[0]] = u.centerX;
    } else {
      X[u.ids[0]] = u.centerX - (NODE_W + COUPLE_GAP) / 2;
      X[u.ids[1]] = u.centerX + (NODE_W + COUPLE_GAP) / 2;
    }
    u.ids.forEach(function(id) { Y[id] = u.gen * (NODE_H + V_GAP) + NODE_H / 2; });
  });
  var minX = Math.min.apply(null, Object.values(X));
  var offset = -minX + 60;
  Object.keys(X).forEach(function(k) { X[k] += offset; });
  allUnits.forEach(function(u) { u.centerX += offset; });

  return { X: X, Y: Y, gen: gen, coupleOf: coupleOf, NODE_W: NODE_W, NODE_H: NODE_H, allUnits: allUnits, unitOf: unitOf, fmap: fmap };
}
