(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DramatisFamilyIndex = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  function normalizeText(value) {
    return String(value == null ? '' : value).normalize('NFKC').trim().toLocaleLowerCase();
  }

  function getSet(map, key) {
    if (!map.has(key)) map.set(key, new Set());
    return map.get(key);
  }

  function participantIds(relation, nodeById) {
    var seen = new Set();
    return (relation && Array.isArray(relation.participants) ? relation.participants : []).reduce(function(ids, item) {
      var id = item && item.nodeId != null ? String(item.nodeId) : '';
      if (id && nodeById.has(id) && !seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
      return ids;
    }, []);
  }

  function traverse(startId, adjacency) {
    var result = new Set();
    var queue = [String(startId)];
    var cursor = 0;
    while (cursor < queue.length) {
      var current = queue[cursor++];
      var neighbors = adjacency.get(current);
      if (!neighbors) continue;
      neighbors.forEach(function(id) {
        if (!result.has(id) && id !== startId) {
          result.add(id);
          queue.push(id);
        }
      });
    }
    return result;
  }

  function connectedComponents(activeIds, personAdjacency) {
    var remaining = new Set(activeIds);
    var components = [];
    activeIds.forEach(function(startId) {
      if (!remaining.has(startId)) return;
      var component = [];
      var queue = [startId];
      remaining.delete(startId);
      for (var cursor = 0; cursor < queue.length; cursor += 1) {
        var current = queue[cursor];
        component.push(current);
        var neighbors = personAdjacency.get(current);
        if (!neighbors) continue;
        neighbors.forEach(function(id) {
          if (remaining.delete(id)) queue.push(id);
        });
      }
      component.sort();
      components.push(component);
    });
    components.sort(function(a, b) {
      return b.length - a.length || String(a[0]).localeCompare(String(b[0]));
    });
    return components;
  }

  function buildFamilyIndex(nodes, relations, options) {
    var nodeList = Array.isArray(nodes) ? nodes : [];
    var relationList = Array.isArray(relations) ? relations : [];
    var opts = options || {};
    var nodeById = new Map();
    var relationById = new Map();
    var relationsByNode = new Map();
    var parentsByChild = new Map();
    var childrenByParent = new Map();
    var unionsByNode = new Map();
    var kinshipByNode = new Map();
    var successionByNode = new Map();
    var personAdjacency = new Map();
    var activeIds = new Set();

    nodeList.forEach(function(node) {
      if (node && node.id != null) nodeById.set(String(node.id), node);
    });

    relationList.forEach(function(relation) {
      if (!relation || relation.id == null) return;
      var relationId = String(relation.id);
      if (!relationById.has(relationId)) relationById.set(relationId, relation);
      var ids = participantIds(relation, nodeById);
      ids.forEach(function(id) {
        activeIds.add(id);
        getSet(relationsByNode, id).add(relationId);
        if (relation.kind === 'union') getSet(unionsByNode, id).add(relationId);
        if (relation.kind === 'kinship') getSet(kinshipByNode, id).add(relationId);
        if (relation.kind === 'succession') getSet(successionByNode, id).add(relationId);
      });
      for (var i = 0; i < ids.length; i += 1) {
        for (var j = i + 1; j < ids.length; j += 1) {
          getSet(personAdjacency, ids[i]).add(ids[j]);
          getSet(personAdjacency, ids[j]).add(ids[i]);
        }
      }
      if (relation.kind === 'parentage') {
        var parents = [];
        var children = [];
        (relation.participants || []).forEach(function(item) {
          if (!item || !nodeById.has(String(item.nodeId))) return;
          if (item.role === 'parent') parents.push(String(item.nodeId));
          if (item.role === 'child') children.push(String(item.nodeId));
        });
        children.forEach(function(childId) {
          parents.forEach(function(parentId) {
            getSet(parentsByChild, childId).add(parentId);
            getSet(childrenByParent, parentId).add(childId);
          });
        });
      }
    });

    var exactTextByNode = new Map();
    var fuzzyTextByNode = new Map();
    nodeList.forEach(function(node) {
      if (!node || node.id == null) return;
      var id = String(node.id);
      var exact = [node.name].concat(Array.isArray(node.aliases) ? node.aliases : [])
        .map(normalizeText).filter(Boolean);
      var tags = opts.tagsByNode && opts.tagsByNode.get ? opts.tagsByNode.get(id) : [];
      var fuzzy = exact.concat([node.notes, node.generationLabel])
        .concat(Array.isArray(node.titles) ? node.titles : [])
        .concat(Array.isArray(tags) ? tags : [])
        .map(normalizeText).filter(Boolean);
      exactTextByNode.set(id, exact);
      fuzzyTextByNode.set(id, fuzzy);
    });

    function search(textByNode, query) {
      var normalized = normalizeText(query);
      if (!normalized) return [];
      return nodeList.filter(function(node) {
        if (!node || node.id == null || node.hidden === true) return false;
        var values = textByNode.get(String(node.id)) || [];
        return values.some(function(value) { return value.indexOf(normalized) !== -1; });
      });
    }

    function neighborhoodOf(startId, depth) {
      var start = String(startId);
      var maximumDepth = Math.max(0, Number.isFinite(Number(depth)) ? Number(depth) : 1);
      var result = new Set(nodeById.has(start) ? [start] : []);
      var queue = [{ id: start, depth: 0 }];
      for (var cursor = 0; cursor < queue.length; cursor += 1) {
        var item = queue[cursor];
        if (item.depth >= maximumDepth) continue;
        var neighbors = personAdjacency.get(item.id);
        if (!neighbors) continue;
        neighbors.forEach(function(id) {
          if (!result.has(id)) {
            result.add(id);
            queue.push({ id: id, depth: item.depth + 1 });
          }
        });
      }
      return result;
    }

    return {
      nodeById: nodeById,
      relationById: relationById,
      relationsByNode: relationsByNode,
      parentsByChild: parentsByChild,
      childrenByParent: childrenByParent,
      unionsByNode: unionsByNode,
      kinshipByNode: kinshipByNode,
      successionByNode: successionByNode,
      components: connectedComponents(activeIds, personAdjacency),
      ancestorsOf: function(nodeId) { return traverse(String(nodeId), parentsByChild); },
      descendantsOf: function(nodeId) { return traverse(String(nodeId), childrenByParent); },
      neighborhoodOf: neighborhoodOf,
      searchExact: function(query) { return search(exactTextByNode, query); },
      searchFuzzy: function(query) { return search(fuzzyTextByNode, query); },
    };
  }

  return {
    buildFamilyIndex: buildFamilyIndex,
    normalizeText: normalizeText,
  };
});
