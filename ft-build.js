// 构建家系数据结构
function buildFamilyData() {
  var flinks = state.links.filter(function(l) { return l.familyRelation; });
  if (flinks.length === 0) return null;

  var fmap = {};
  function ensure(id) {
    if (!fmap[id]) {
      var n = state.nodes.find(function(x) { return x.id === id; });
      fmap[id] = { adj: { parents: new Set(), children: new Set(), spouses: new Set(), siblings: new Set() }, node: n || { id: id, name: '?', isPlaceholder: true, gender: '' } };
    }
    return fmap[id];
  }

  flinks.forEach(function(l) {
    var sid = l.source.id || l.source;
    var tid = l.target.id || l.target;
    var s = ensure(sid), t = ensure(tid);
    switch (l.familyRelation) {
      case 'parent': s.adj.children.add(tid); t.adj.parents.add(sid); break;
      case 'child': s.adj.parents.add(tid); t.adj.children.add(sid); break;
      case 'spouse': s.adj.spouses.add(tid); t.adj.spouses.add(sid); break;
      case 'sibling': s.adj.siblings.add(tid); t.adj.siblings.add(sid); break;
    }
  });

  autoFillMissing(fmap);
  return { fmap: fmap, flinks: flinks };
}

function autoFillMissing(fmap) {
  var siblingGroups = {};
  Object.keys(fmap).forEach(function(id) {
    fmap[id].adj.siblings.forEach(function(sibId) {
      var key = [id, sibId].sort().join('|');
      if (!siblingGroups[key]) siblingGroups[key] = new Set();
      siblingGroups[key].add(id); siblingGroups[key].add(sibId);
    });
  });
  Object.values(siblingGroups).forEach(function(group) {
    var ids = Array.from(group);
    var hasParent = ids.some(function(id) { return fmap[id].adj.parents.size > 0; });
    if (!hasParent && ids.length >= 2) {
      var sorted = ids.sort();
      var fatherId = '_ph_f_' + sorted.join('_');
      var motherId = '_ph_m_' + sorted.join('_');
      [fatherId, motherId].forEach(function(phId) {
        if (!fmap[phId]) {
          fmap[phId] = { adj: { parents: new Set(), children: new Set(ids), spouses: new Set(), siblings: new Set() }, node: { id: phId, name: phId.indexOf('_ph_f_') === 0 ? '父?' : '母?', isPlaceholder: true, gender: phId.indexOf('_ph_f_') === 0 ? 'male' : 'female' } };
          ids.forEach(function(id) { fmap[id].adj.parents.add(phId); });
        }
      });
      if (!fmap[fatherId].adj.spouses.has(motherId)) {
        fmap[fatherId].adj.spouses.add(motherId);
        fmap[motherId].adj.spouses.add(fatherId);
      }
    }
  });
}
