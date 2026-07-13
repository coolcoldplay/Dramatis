(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.DramatisFamilyLayout = factory(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function(root) {
  'use strict';

  var PERSON_WIDTH = 132;
  var PERSON_HEIGHT = 60;
  var HUB_SIZE = 18;

  function unique(values) {
    return Array.from(new Set(values));
  }

  function validParticipants(relation, nodeById) {
    return (relation && Array.isArray(relation.participants) ? relation.participants : []).filter(function(item) {
      return item && item.nodeId != null && nodeById.has(String(item.nodeId));
    }).map(function(item) {
      return { nodeId: String(item.nodeId), role: String(item.role || '') };
    });
  }

  function buildFamilyRenderModel(nodes, relations, index, diagnostics, view) {
    var nodeList = Array.isArray(nodes) ? nodes : [];
    var relationList = Array.isArray(relations) ? relations : [];
    var nodeById = index && index.nodeById ? index.nodeById : new Map(nodeList.map(function(node) { return [String(node.id), node]; }));
    var errors = new Set((diagnostics || []).filter(function(item) {
      return item.severity === 'error' && item.relationId;
    }).map(function(item) { return String(item.relationId); }));
    var cycleSets = (diagnostics || []).filter(function(item) { return item.code === 'PARENTAGE_CYCLE'; })
      .map(function(item) { return new Set(item.nodeIds || []); });
    var activePersonIds = new Set();
    var hubs = [];
    var hubById = new Map();
    var edges = [];
    var generationEdges = [];
    var relationModels = [];

    function addHub(relation) {
      var id = 'hub:' + relation.id;
      if (hubById.has(id)) return hubById.get(id);
      var hub = {
        id: id,
        relationId: String(relation.id),
        kind: relation.kind || 'other',
        subtype: relation.subtype || 'other',
        status: relation.status || 'unknown',
        certainty: relation.certainty || 'unknown',
        label: relation.label || '',
        width: HUB_SIZE,
        height: HUB_SIZE,
      };
      hubs.push(hub);
      hubById.set(id, hub);
      return hub;
    }

    function addEdge(id, sourceId, targetId, relation, role, feedback) {
      edges.push({
        id: id,
        sourceId: sourceId,
        targetId: targetId,
        relationId: String(relation.id),
        kind: relation.kind || 'other',
        subtype: relation.subtype || 'other',
        certainty: relation.certainty || 'unknown',
        role: role || '',
        feedback: feedback === true,
      });
    }

    relationList.forEach(function(relation) {
      if (!relation || relation.id == null || relation.hidden === true || errors.has(String(relation.id))) return;
      var participants = validParticipants(relation, nodeById);
      if (participants.length < 2) return;
      participants.forEach(function(item) { activePersonIds.add(item.nodeId); });
      relationModels.push({ relation: relation, participants: participants });
      if (relation.kind === 'union') {
        var unionHub = addHub(relation);
        participants.forEach(function(item, participantIndex) {
          addEdge('edge:' + relation.id + ':partner:' + participantIndex, item.nodeId, unionHub.id, relation, item.role);
        });
      } else if (relation.kind === 'parentage') {
        var parents = participants.filter(function(item) { return item.role === 'parent'; });
        var children = participants.filter(function(item) { return item.role === 'child'; });
        if (!parents.length || children.length !== 1) return;
        var contextHub = relation.contextId ? hubById.get('hub:' + relation.contextId) : null;
        var parentageHub = contextHub || addHub(relation);
        var feedback = parents.some(function(parent) {
          return cycleSets.some(function(set) { return set.has(parent.nodeId) && set.has(children[0].nodeId); });
        });
        if (!contextHub) {
          parents.forEach(function(parent, parentIndex) {
            addEdge('edge:' + relation.id + ':parent:' + parentIndex, parent.nodeId, parentageHub.id, relation, 'parent', feedback);
          });
        }
        addEdge('edge:' + relation.id + ':child', parentageHub.id, children[0].nodeId, relation, 'child', feedback);
        parents.forEach(function(parent) {
          generationEdges.push({
            sourceId: parent.nodeId,
            targetId: children[0].nodeId,
            relationId: String(relation.id),
            feedback: feedback,
          });
        });
      } else if (relation.kind === 'succession') {
        var predecessors = participants.filter(function(item) { return item.role === 'predecessor'; });
        var successors = participants.filter(function(item) { return item.role === 'successor'; });
        predecessors.forEach(function(predecessor, predecessorIndex) {
          successors.forEach(function(successor, successorIndex) {
            addEdge('edge:' + relation.id + ':' + predecessorIndex + ':' + successorIndex, predecessor.nodeId, successor.nodeId, relation, 'succession');
          });
        });
      } else if (participants.length === 2) {
        addEdge('edge:' + relation.id, participants[0].nodeId, participants[1].nodeId, relation, 'peer');
      } else {
        var relationHub = addHub(relation);
        participants.forEach(function(item, participantIndex) {
          addEdge('edge:' + relation.id + ':member:' + participantIndex, item.nodeId, relationHub.id, relation, item.role);
        });
      }
    });

    // Parentage can refer to a union that appears later in the input. Rewire to it after all hubs exist.
    relationModels.forEach(function(item) {
      var relation = item.relation;
      if (relation.kind !== 'parentage' || !relation.contextId) return;
      var desiredHubId = 'hub:' + relation.contextId;
      if (!hubById.has(desiredHubId)) return;
      var currentHubId = 'hub:' + relation.id;
      edges.forEach(function(edge) {
        if (edge.relationId !== String(relation.id)) return;
        if (edge.sourceId === currentHubId) edge.sourceId = desiredHubId;
        if (edge.targetId === currentHubId) edge.targetId = desiredHubId;
      });
      if (hubById.has(currentHubId)) {
        hubById.delete(currentHubId);
        hubs = hubs.filter(function(hub) { return hub.id !== currentHubId; });
      }
    });

    var houseCategoryId = view && view.houseTagCategoryId;
    var personNodes = nodeList.filter(function(node) {
      return node && node.id != null && activePersonIds.has(String(node.id));
    }).map(function(node, order) {
      var houseId = houseCategoryId && node.tags ? node.tags[houseCategoryId] : null;
      if (Array.isArray(houseId)) houseId = houseId[0];
      return {
        id: String(node.id),
        node: node,
        name: node.name || String(node.id),
        width: PERSON_WIDTH,
        height: PERSON_HEIGHT,
        order: order,
        houseId: houseId == null || houseId === '' ? '__untagged__' : String(houseId),
      };
    });

    return {
      personNodes: personNodes,
      hubs: hubs,
      edges: edges,
      generationEdges: generationEdges,
      diagnostics: diagnostics || [],
      view: view || {},
    };
  }

  function buildElkGraph(model, viewOptions) {
    var view = viewOptions || {};
    var generationGap = Number(view.generationGap) || 150;
    var branchGap = Number(view.branchGap) || 48;
    return {
      id: 'family-root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'DOWN',
        'elk.edgeRouting': 'ORTHOGONAL',
        'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
        'elk.layered.cycleBreaking.strategy': 'MODEL_ORDER',
        'elk.spacing.nodeNode': String(branchGap),
        'elk.layered.spacing.nodeNodeBetweenLayers': String(Math.max(40, generationGap - PERSON_HEIGHT)),
        'elk.spacing.componentComponent': String(Number(view.componentGap) || 120),
      },
      children: model.personNodes.concat(model.hubs).map(function(node) {
        return { id: node.id, width: node.width, height: node.height };
      }),
      edges: model.edges.map(function(edge) {
        return {
          id: edge.id,
          sources: [edge.sourceId],
          targets: [edge.targetId],
          layoutOptions: edge.feedback ? { 'elk.layered.priority.direction': '0' } : undefined,
        };
      }),
    };
  }

  function nodeMapFromModel(model) {
    var map = new Map();
    model.personNodes.concat(model.hubs).forEach(function(node) { map.set(node.id, node); });
    return map;
  }

  function normalizeElkResult(result, model) {
    if (!result || !Array.isArray(result.children)) return null;
    var definitions = nodeMapFromModel(model);
    var nodes = {};
    result.children.forEach(function(child) {
      var definition = definitions.get(String(child.id));
      if (!definition) return;
      nodes[String(child.id)] = {
        id: String(child.id),
        x: Number(child.x),
        y: Number(child.y),
        width: Number(child.width) || definition.width,
        height: Number(child.height) || definition.height,
        type: String(child.id).indexOf('hub:') === 0 ? 'hub' : 'person',
      };
    });
    if (Object.keys(nodes).length !== definitions.size) return null;
    var elkEdges = new Map((result.edges || []).map(function(edge) { return [String(edge.id), edge]; }));
    var edges = model.edges.map(function(edge) {
      var raw = elkEdges.get(edge.id);
      var points = [];
      if (raw && raw.sections && raw.sections[0]) {
        var section = raw.sections[0];
        points = [section.startPoint].concat(section.bendPoints || [], [section.endPoint]).filter(Boolean).map(function(point) {
          return { x: Number(point.x), y: Number(point.y) };
        });
      }
      return Object.assign({}, edge, { points: points });
    });
    return {
      nodes: nodes,
      edges: edges,
      components: [],
      bounds: { x: 0, y: 0, width: Number(result.width) || 0, height: Number(result.height) || 0 },
      width: Number(result.width) || 0,
      height: Number(result.height) || 0,
      mode: 'elk',
    };
  }

  function calculateRanks(model) {
    var ranks = new Map(model.personNodes.map(function(node) { return [node.id, 0]; }));
    var usable = model.generationEdges.filter(function(edge) { return !edge.feedback; });
    for (var pass = 0; pass < model.personNodes.length; pass += 1) {
      var changed = false;
      usable.forEach(function(edge) {
        var next = (ranks.get(edge.sourceId) || 0) + 1;
        if (next > (ranks.get(edge.targetId) || 0)) {
          ranks.set(edge.targetId, next);
          changed = true;
        }
      });
      if (!changed) break;
    }
    return ranks;
  }

  function graphComponents(model) {
    var allIds = model.personNodes.concat(model.hubs).map(function(node) { return node.id; });
    var adjacency = new Map(allIds.map(function(id) { return [id, new Set()]; }));
    model.edges.forEach(function(edge) {
      if (!adjacency.has(edge.sourceId) || !adjacency.has(edge.targetId)) return;
      adjacency.get(edge.sourceId).add(edge.targetId);
      adjacency.get(edge.targetId).add(edge.sourceId);
    });
    var remaining = new Set(allIds);
    var components = [];
    allIds.forEach(function(start) {
      if (!remaining.delete(start)) return;
      var ids = [];
      var queue = [start];
      for (var cursor = 0; cursor < queue.length; cursor += 1) {
        var current = queue[cursor];
        ids.push(current);
        adjacency.get(current).forEach(function(id) {
          if (remaining.delete(id)) queue.push(id);
        });
      }
      components.push(ids);
    });
    return components;
  }

  function boundsFor(ids, positions) {
    var minimumX = Infinity;
    var minimumY = Infinity;
    var maximumX = -Infinity;
    var maximumY = -Infinity;
    ids.forEach(function(id) {
      var point = positions[id];
      if (!point) return;
      minimumX = Math.min(minimumX, point.x);
      minimumY = Math.min(minimumY, point.y);
      maximumX = Math.max(maximumX, point.x + point.width);
      maximumY = Math.max(maximumY, point.y + point.height);
    });
    if (!Number.isFinite(minimumX)) return { x: 0, y: 0, width: 0, height: 0 };
    return { x: minimumX, y: minimumY, width: maximumX - minimumX, height: maximumY - minimumY };
  }

  function boxesOverlap(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x
      && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  function computeFallbackLayout(model, viewOptions) {
    var view = viewOptions || {};
    var generationGap = Number(view.generationGap) || 150;
    var branchGap = Number(view.branchGap) || 48;
    var componentGap = Number(view.componentGap) || 120;
    var ranks = calculateRanks(model);
    var definitions = nodeMapFromModel(model);
    var positions = {};
    var components = graphComponents(model);

    components.forEach(function(ids) {
      var people = ids.filter(function(id) { return id.indexOf('hub:') !== 0; });
      var byRank = new Map();
      people.forEach(function(id) {
        var rank = ranks.get(id) || 0;
        if (!byRank.has(rank)) byRank.set(rank, []);
        byRank.get(rank).push(id);
      });
      byRank.forEach(function(rankIds, rank) {
        rankIds.sort(function(a, b) {
          var aNode = definitions.get(a);
          var bNode = definitions.get(b);
          if (view.layoutMode === 'house' && aNode.houseId !== bNode.houseId) {
            if (aNode.houseId === '__untagged__') return 1;
            if (bNode.houseId === '__untagged__') return -1;
            return aNode.houseId.localeCompare(bNode.houseId);
          }
          return aNode.order - bNode.order || a.localeCompare(b);
        });
        var rankCursorX = 0;
        var previousHouseId = null;
        rankIds.forEach(function(id) {
          var definition = definitions.get(id);
          if (view.layoutMode === 'house' && previousHouseId != null && previousHouseId !== definition.houseId) {
            rankCursorX += branchGap * 1.5;
          }
          positions[id] = {
            id: id,
            x: rankCursorX,
            y: rank * generationGap,
            width: PERSON_WIDTH,
            height: PERSON_HEIGHT,
            type: 'person',
          };
          rankCursorX += PERSON_WIDTH + branchGap;
          previousHouseId = definition.houseId;
        });
      });
      ids.filter(function(id) { return id.indexOf('hub:') === 0; }).forEach(function(id, hubOrder) {
        var connected = model.edges.filter(function(edge) { return edge.sourceId === id || edge.targetId === id; })
          .map(function(edge) { return edge.sourceId === id ? edge.targetId : edge.sourceId; })
          .filter(function(nodeId) { return positions[nodeId]; });
        var averageX = connected.length ? connected.reduce(function(sum, nodeId) {
          return sum + positions[nodeId].x + positions[nodeId].width / 2;
        }, 0) / connected.length : hubOrder * (HUB_SIZE + branchGap);
        var incomingY = connected.filter(function(nodeId) { return ranks.has(nodeId); }).map(function(nodeId) {
          return positions[nodeId].y;
        });
        var minimumY = incomingY.length ? Math.min.apply(null, incomingY) : 0;
        var maximumY = incomingY.length ? Math.max.apply(null, incomingY) : minimumY;
        positions[id] = {
          id: id,
          x: averageX - HUB_SIZE / 2,
          y: minimumY === maximumY ? minimumY + PERSON_HEIGHT + 22 : (minimumY + maximumY + PERSON_HEIGHT) / 2,
          width: HUB_SIZE,
          height: HUB_SIZE,
          type: 'hub',
        };
      });
    });

    var local = components.map(function(ids, index) {
      var bounds = boundsFor(ids, positions);
      return { id: 'component:' + index, ids: ids, bounds: bounds, area: Math.max(1, bounds.width * bounds.height) };
    }).sort(function(a, b) { return b.area - a.area || a.id.localeCompare(b.id); });
    var totalArea = local.reduce(function(sum, component) { return sum + component.area; }, 0);
    var targetWidth = Math.max(480, Math.sqrt(totalArea) * 1.45);
    var cursorX = 0;
    var cursorY = 0;
    var rowHeight = 0;
    local.forEach(function(component) {
      if (cursorX > 0 && cursorX + component.bounds.width > targetWidth) {
        cursorX = 0;
        cursorY += rowHeight + componentGap;
        rowHeight = 0;
      }
      var offsetX = cursorX - component.bounds.x;
      var offsetY = cursorY - component.bounds.y;
      component.ids.forEach(function(id) {
        positions[id].x += offsetX;
        positions[id].y += offsetY;
      });
      component.bounds = { x: cursorX, y: cursorY, width: component.bounds.width, height: component.bounds.height };
      cursorX += component.bounds.width + componentGap;
      rowHeight = Math.max(rowHeight, component.bounds.height);
    });

    var edges = model.edges.map(function(edge) {
      var source = positions[edge.sourceId];
      var target = positions[edge.targetId];
      var sourcePoint = { x: source.x + source.width / 2, y: source.y + source.height / 2 };
      var targetPoint = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
      var middleY = (sourcePoint.y + targetPoint.y) / 2;
      return Object.assign({}, edge, {
        points: [sourcePoint, { x: sourcePoint.x, y: middleY }, { x: targetPoint.x, y: middleY }, targetPoint],
      });
    });
    var allBounds = boundsFor(Object.keys(positions), positions);
    return {
      nodes: positions,
      edges: edges,
      components: local,
      bounds: allBounds,
      width: allBounds.width,
      height: allBounds.height,
      mode: 'fallback',
    };
  }

  function isFiniteLayout(layout) {
    if (!layout || !layout.nodes || !layout.edges) return false;
    return Object.keys(layout.nodes).length > 0 && Object.keys(layout.nodes).every(function(id) {
      var point = layout.nodes[id];
      return Number.isFinite(point.x) && Number.isFinite(point.y)
        && Number.isFinite(point.width) && Number.isFinite(point.height);
    }) && layout.edges.every(function(edge) {
      return (edge.points || []).every(function(point) { return Number.isFinite(point.x) && Number.isFinite(point.y); });
    });
  }

  function createLayoutCacheKey(model, viewOptions) {
    var view = viewOptions || {};
    var structural = {
      nodes: model.personNodes.concat(model.hubs).map(function(node) { return [node.id, node.houseId || null]; }).sort(),
      edges: model.edges.map(function(edge) { return [edge.id, edge.sourceId, edge.targetId, edge.feedback]; }).sort(),
      mode: view.layoutMode || 'lineage',
      house: view.houseTagCategoryId || null,
      generationGap: Number(view.generationGap) || 150,
      branchGap: Number(view.branchGap) || 48,
      componentGap: Number(view.componentGap) || 120,
      collapsed: (view.collapsedNodeIds || []).slice().sort(),
    };
    return JSON.stringify(structural);
  }

  function shouldUseFallbackLayout(model, viewOptions, limits) {
    var view = viewOptions || {};
    var settings = limits || {};
    if (view.layoutMode === 'house') return true;
    var nodeLimit = Number(settings.maxElkNodes) || 400;
    var edgeLimit = Number(settings.maxElkEdges) || 700;
    var nodeCount = (model.personNodes || []).length + (model.hubs || []).length;
    var edgeCount = (model.edges || []).length;
    return nodeCount > nodeLimit || edgeCount > edgeLimit;
  }

  function createLayoutEngine(options) {
    var opts = options || {};
    var elk = opts.elk || null;
    var mode = elk ? 'main' : 'fallback';
    var disposed = false;
    var requestToken = 0;
    var cache = new Map();

    if (!elk && root && typeof root.ELK === 'function') {
      try {
        var protocol = root.location && root.location.protocol;
        if ((protocol === 'http:' || protocol === 'https:') && typeof root.Worker === 'function') {
          var workerUrl = opts.workerUrl || 'src/family/family-layout-worker.js';
          elk = new root.ELK({
            workerFactory: function() { return new root.Worker(workerUrl); },
          });
          mode = 'worker';
        } else {
          elk = new root.ELK();
          mode = 'main';
        }
      } catch (error) {
        elk = null;
        mode = 'fallback';
      }
    }

    async function layout(model, viewOptions) {
      if (disposed) throw new Error('Family layout engine is disposed');
      var key = createLayoutCacheKey(model, viewOptions);
      if (cache.has(key)) return cache.get(key);
      var token = ++requestToken;
      var result = null;
      if (shouldUseFallbackLayout(model, viewOptions, opts)) {
        result = computeFallbackLayout(model, viewOptions);
      } else if (elk && typeof elk.layout === 'function') {
        try {
          var raw = await elk.layout(buildElkGraph(model, viewOptions));
          if (token !== requestToken || disposed) {
            var cancelled = new Error('Family layout request cancelled');
            cancelled.code = 'LAYOUT_CANCELLED';
            throw cancelled;
          }
          result = normalizeElkResult(raw, model);
        } catch (error) {
          if (error && error.code === 'LAYOUT_CANCELLED') throw error;
          result = null;
        }
      }
      if (!isFiniteLayout(result)) result = computeFallbackLayout(model, viewOptions);
      cache.set(key, result);
      return result;
    }

    return {
      layout: layout,
      cancel: function() { requestToken += 1; },
      dispose: function() {
        disposed = true;
        requestToken += 1;
        cache.clear();
        if (elk && typeof elk.terminateWorker === 'function') elk.terminateWorker();
      },
      mode: mode,
    };
  }

  return {
    PERSON_WIDTH: PERSON_WIDTH,
    PERSON_HEIGHT: PERSON_HEIGHT,
    HUB_SIZE: HUB_SIZE,
    buildFamilyRenderModel: buildFamilyRenderModel,
    buildElkGraph: buildElkGraph,
    normalizeElkResult: normalizeElkResult,
    computeFallbackLayout: computeFallbackLayout,
    createLayoutCacheKey: createLayoutCacheKey,
    shouldUseFallbackLayout: shouldUseFallbackLayout,
    isFiniteLayout: isFiniteLayout,
    createLayoutEngine: createLayoutEngine,
    boxesOverlap: boxesOverlap,
  };
});
