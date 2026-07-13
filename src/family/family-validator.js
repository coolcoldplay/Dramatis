(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DramatisFamilyValidator = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  function hasFiniteParticipants(relation) {
    return Boolean(relation && Array.isArray(relation.participants) && relation.participants.length
      && relation.participants.every(function(item) {
        return item && item.nodeId != null && String(item.nodeId).trim() !== '';
      }));
  }

  function addEdge(map, source, target) {
    if (!map.has(source)) map.set(source, new Set());
    map.get(source).add(target);
  }

  function parentageGraph(nodes, relations) {
    var adjacency = new Map();
    var reverse = new Map();
    var edgeRelations = new Map();
    (Array.isArray(nodes) ? nodes : []).forEach(function(node) {
      if (node && node.id != null) {
        var id = String(node.id);
        if (!adjacency.has(id)) adjacency.set(id, new Set());
        if (!reverse.has(id)) reverse.set(id, new Set());
      }
    });
    (Array.isArray(relations) ? relations : []).forEach(function(relation) {
      if (!relation || relation.kind !== 'parentage') return;
      var parents = [];
      var children = [];
      (relation.participants || []).forEach(function(item) {
        if (!item || item.nodeId == null || String(item.nodeId).trim() === '') return;
        if (item.role === 'parent') parents.push(String(item.nodeId));
        if (item.role === 'child') children.push(String(item.nodeId));
      });
      parents.forEach(function(parentId) {
        children.forEach(function(childId) {
          addEdge(adjacency, parentId, childId);
          addEdge(reverse, childId, parentId);
          if (!adjacency.has(childId)) adjacency.set(childId, new Set());
          if (!reverse.has(parentId)) reverse.set(parentId, new Set());
          var key = parentId + '\u0000' + childId;
          if (!edgeRelations.has(key)) edgeRelations.set(key, new Set());
          edgeRelations.get(key).add(String(relation.id || ''));
        });
      });
    });
    return { adjacency: adjacency, reverse: reverse, edgeRelations: edgeRelations };
  }

  function finishOrder(adjacency) {
    var visited = new Set();
    var order = [];
    adjacency.forEach(function(_, start) {
      if (visited.has(start)) return;
      var stack = [{ id: start, expanded: false }];
      while (stack.length) {
        var item = stack.pop();
        if (item.expanded) {
          order.push(item.id);
          continue;
        }
        if (visited.has(item.id)) continue;
        visited.add(item.id);
        stack.push({ id: item.id, expanded: true });
        var neighbors = Array.from(adjacency.get(item.id) || []);
        for (var i = neighbors.length - 1; i >= 0; i -= 1) {
          if (!visited.has(neighbors[i])) stack.push({ id: neighbors[i], expanded: false });
        }
      }
    });
    return order;
  }

  function findParentageCycles(nodes, relations) {
    var graph = parentageGraph(nodes, relations);
    var order = finishOrder(graph.adjacency);
    var assigned = new Set();
    var cycles = [];
    for (var cursor = order.length - 1; cursor >= 0; cursor -= 1) {
      var start = order[cursor];
      if (assigned.has(start)) continue;
      var component = [];
      var stack = [start];
      assigned.add(start);
      while (stack.length) {
        var current = stack.pop();
        component.push(current);
        (graph.reverse.get(current) || []).forEach(function(id) {
          if (!assigned.has(id)) {
            assigned.add(id);
            stack.push(id);
          }
        });
      }
      var selfCycle = component.length === 1
        && (graph.adjacency.get(component[0]) || new Set()).has(component[0]);
      if (component.length > 1 || selfCycle) {
        var memberSet = new Set(component);
        var relationIds = new Set();
        component.forEach(function(source) {
          (graph.adjacency.get(source) || []).forEach(function(target) {
            if (!memberSet.has(target)) return;
            (graph.edgeRelations.get(source + '\u0000' + target) || []).forEach(function(id) {
              if (id) relationIds.add(id);
            });
          });
        });
        cycles.push({
          nodeIds: component.sort(),
          relationIds: Array.from(relationIds).sort(),
        });
      }
    }
    cycles.sort(function(a, b) { return String(a.nodeIds[0]).localeCompare(String(b.nodeIds[0])); });
    return cycles;
  }

  function validateFamilyGraph(nodes, relations) {
    var nodeList = Array.isArray(nodes) ? nodes : [];
    var relationList = Array.isArray(relations) ? relations : [];
    var nodeIds = new Set();
    var relationIds = new Set();
    var relationById = new Map();
    var diagnostics = [];
    var sequence = 0;

    function report(severity, code, message, relationId, relatedNodeIds) {
      diagnostics.push({
        id: 'FD' + (++sequence),
        severity: severity,
        code: code,
        message: message,
        relationId: relationId || null,
        nodeIds: Array.from(new Set((relatedNodeIds || []).filter(Boolean))),
      });
    }

    nodeList.forEach(function(node) {
      if (!node || node.id == null || String(node.id).trim() === '') return;
      var id = String(node.id);
      if (nodeIds.has(id)) report('error', 'DUPLICATE_NODE_ID', '人物 ID 重复：' + id, null, [id]);
      nodeIds.add(id);
    });
    relationList.forEach(function(relation) {
      var relationId = relation && relation.id != null ? String(relation.id) : '';
      if (!relationId) {
        report('error', 'MISSING_RELATION_ID', '家系关系缺少 ID', null, []);
      } else if (relationIds.has(relationId)) {
        report('error', 'DUPLICATE_RELATION_ID', '家系关系 ID 重复：' + relationId, relationId, []);
      } else {
        relationIds.add(relationId);
        relationById.set(relationId, relation);
      }
    });

    relationList.forEach(function(relation) {
      if (!relation) return;
      var relationId = relation.id == null ? null : String(relation.id);
      var participants = Array.isArray(relation.participants) ? relation.participants : [];
      participants.forEach(function(item) {
        var nodeId = item && item.nodeId != null ? String(item.nodeId).trim() : '';
        if (!nodeId) {
          report('error', 'EMPTY_PARTICIPANT_ID', '关系参与者缺少人物 ID', relationId, []);
        } else if (!nodeIds.has(nodeId)) {
          report('error', 'MISSING_PARTICIPANT', '关系引用了不存在的人物：' + nodeId, relationId, [nodeId]);
        }
        if (!item || !item.role) {
          report('error', 'MISSING_PARTICIPANT_ROLE', '关系参与者缺少角色', relationId, nodeId ? [nodeId] : []);
        }
      });
      if (relation.contextId && !relationById.has(String(relation.contextId))) {
        report('warning', 'UNKNOWN_CONTEXT', '关系引用了不存在的上下文：' + relation.contextId, relationId, []);
      }
      if (relation.kind === 'parentage') {
        var parents = participants.filter(function(item) { return item && item.role === 'parent'; });
        var children = participants.filter(function(item) { return item && item.role === 'child'; });
        if (!parents.length) report('error', 'PARENTAGE_WITHOUT_PARENT', '亲子关系至少需要一位 parent', relationId, []);
        if (!children.length) report('error', 'PARENTAGE_WITHOUT_CHILD', '亲子关系需要一位 child', relationId, []);
        if (children.length > 1) report('error', 'PARENTAGE_MULTIPLE_CHILDREN', '单个亲子事件只能有一位 child', relationId, children.map(function(item) { return item.nodeId; }));
      }
      if (relation.kind === 'union' && participants.length < 2) {
        report('error', 'UNION_TOO_FEW_PARTICIPANTS', '伴侣关系至少需要两位参与者', relationId, []);
      }
    });

    findParentageCycles(nodeList, relationList).forEach(function(cycle) {
      report(
        'warning',
        'PARENTAGE_CYCLE',
        '亲子关系形成环：' + cycle.nodeIds.join(' → '),
        cycle.relationIds[0] || null,
        cycle.nodeIds
      );
    });

    return diagnostics;
  }

  return {
    validateFamilyGraph: validateFamilyGraph,
    findParentageCycles: findParentageCycles,
    hasFiniteParticipants: hasFiniteParticipants,
  };
});
