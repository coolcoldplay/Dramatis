(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DramatisLayoutForces = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function clamp(value, min, max) {
    if (min > max) return (min + max) / 2;
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
        node.vx = 0;
        node.vy = 0;
        node.fx = null;
        node.fy = null;
      }
    });
    return changed;
  }

  function isInsideInterior(node, bounds, padding) {
    if (!node) return false;
    var x = Number.isFinite(node.x) ? node.x : NaN;
    var y = Number.isFinite(node.y) ? node.y : NaN;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    return x >= bounds.minX + padding &&
      x <= bounds.maxX - padding &&
      y >= bounds.minY + padding &&
      y <= bounds.maxY - padding;
  }

  function spreadNodesInsideBounds(nodes, bounds, options) {
    var opts = options || {};
    var pad = Math.max(0, Number(opts.padding) || 0);
    var includeInside = opts.includeInside === true;
    var width = Math.max(1, bounds.maxX - bounds.minX - pad * 2);
    var height = Math.max(1, bounds.maxY - bounds.minY - pad * 2);
    var targets = (nodes || []).filter(function(node) {
      return includeInside || !isInsideInterior(node, bounds, pad);
    });
    var count = targets.length;
    if (!count) return 0;

    var aspect = Math.max(0.1, width / Math.max(1, height));
    var cols = Math.max(1, Math.ceil(Math.sqrt(count * aspect)));
    var rows = Math.max(1, Math.ceil(count / cols));
    var cellW = width / cols;
    var cellH = height / rows;
    var changed = 0;

    targets.forEach(function(node, index) {
      var row = Math.floor(index / cols);
      var col = index % cols;
      var offset = rows > 1 && row % 2 === 1 ? 0.5 : 0;
      var x = bounds.minX + pad + cellW * (col + 0.5 + offset / Math.max(1, cols));
      var y = bounds.minY + pad + cellH * (row + 0.5);
      x = clamp(x, bounds.minX + pad, bounds.maxX - pad);
      y = clamp(y, bounds.minY + pad, bounds.maxY - pad);

      if (node.x !== x || node.y !== y) changed += 1;
      node.x = x;
      node.y = y;
      node.vx = 0;
      node.vy = 0;
      node.fx = null;
      node.fy = null;
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

  function normalizeSpacing(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) return 1;
    return Math.min(2.4, Math.max(0.5, n));
  }

  function distributeClusterCenters(keys, bounds, options) {
    var ids = Array.from(keys || []);
    var centers = new Map();
    if (!ids.length) return centers;

    var opts = options || {};
    var spacing = normalizeSpacing(opts.spacing);
    var inset = Math.max(40, Number(opts.margin) || 40);
    var width = Math.max(1, bounds.maxX - bounds.minX);
    var height = Math.max(1, bounds.maxY - bounds.minY);
    var maxRadiusX = Math.max(0, width / 2 - inset);
    var maxRadiusY = Math.max(0, height / 2 - inset);
    var radiusX = Math.min(maxRadiusX, Math.max(80, width * 0.34) * spacing);
    var radiusY = Math.min(maxRadiusY, Math.max(80, height * 0.30) * spacing);
    var cx = bounds.minX + width / 2;
    var cy = bounds.minY + height / 2;

    if (ids.length === 1) {
      centers.set(ids[0], { x: cx, y: cy });
      return centers;
    }

    ids.forEach(function(id, index) {
      var angle = -Math.PI / 2 + index * Math.PI * 2 / ids.length;
      centers.set(id, {
        x: cx + Math.cos(angle) * radiusX,
        y: cy + Math.sin(angle) * radiusY,
      });
    });
    return centers;
  }

  function buildClusterTargets(nodes, category, bounds, options) {
    var tags = (category && category.tags) || [];
    var tagById = new Map();
    tags.forEach(function(tag) {
      if (tag && tag.id) tagById.set(tag.id, tag);
    });

    var clusterKeys = [];
    var nodeClusterKey = new Map();
    (nodes || []).forEach(function(node) {
      var tagId = node && node.tags && category ? node.tags[category.id] : null;
      var tag = tagById.get(tagId);
      var key = tag ? tag.id : '__untagged__';
      if (!clusterKeys.includes(key)) clusterKeys.push(key);
      if (node && node.id) nodeClusterKey.set(node.id, key);
    });

    var clusterCenters = distributeClusterCenters(clusterKeys, bounds, options);
    var nodeTargets = new Map();
    (nodes || []).forEach(function(node) {
      if (!node || !node.id) return;
      var key = nodeClusterKey.get(node.id);
      var center = clusterCenters.get(key);
      var tag = tagById.get(key);
      nodeTargets.set(node.id, {
        x: center.x,
        y: center.y,
        label: tag ? tag.name : '\u672a\u5206\u7c7b',
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

  function endpointId(endpoint) {
    return endpoint && typeof endpoint === 'object' ? endpoint.id : endpoint;
  }

  function buildComponents(nodes, links) {
    var nodeById = new Map();
    var adjacency = new Map();
    (nodes || []).forEach(function(node) {
      if (!node || !node.id) return;
      nodeById.set(node.id, node);
      adjacency.set(node.id, []);
    });
    (links || []).forEach(function(link) {
      var sourceId = endpointId(link && link.source);
      var targetId = endpointId(link && link.target);
      if (!adjacency.has(sourceId) || !adjacency.has(targetId)) return;
      adjacency.get(sourceId).push(targetId);
      adjacency.get(targetId).push(sourceId);
    });

    var seen = new Set();
    var components = [];
    nodeById.forEach(function(node, id) {
      if (seen.has(id)) return;
      var stack = [id];
      var members = [];
      seen.add(id);
      while (stack.length) {
        var currentId = stack.pop();
        var currentNode = nodeById.get(currentId);
        if (currentNode) members.push(currentNode);
        (adjacency.get(currentId) || []).forEach(function(nextId) {
          if (seen.has(nextId)) return;
          seen.add(nextId);
          stack.push(nextId);
        });
      }
      components.push(members);
    });
    return components;
  }

  function componentCentroid(component) {
    var count = Math.max(1, component.length);
    var sumX = 0;
    var sumY = 0;
    component.forEach(function(node) {
      sumX += Number(node.x) || 0;
      sumY += Number(node.y) || 0;
    });
    return { x: sumX / count, y: sumY / count };
  }

  function createComponentTetherForce(linksProvider, options) {
    var nodes = [];
    var opts = options || {};
    var maxDistance = Math.max(1, Number(opts.maxDistance) || 900);
    var strength = Math.max(0, Number(opts.strength) || 0.015);

    function force(alpha) {
      if (!nodes.length || strength <= 0) return;
      var links = typeof linksProvider === 'function' ? linksProvider() : linksProvider;
      var components = buildComponents(nodes, links);
      if (components.length <= 1) return;

      components.sort(function(a, b) { return b.length - a.length; });
      var main = components[0];
      var mainCenter = componentCentroid(main);

      for (var i = 1; i < components.length; i += 1) {
        var component = components[i];
        var center = componentCentroid(component);
        var dx = mainCenter.x - center.x;
        var dy = mainCenter.y - center.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        if (!Number.isFinite(distance) || distance <= maxDistance) continue;
        var excess = distance - maxDistance;
        var ux = dx / distance;
        var uy = dy / distance;
        var pull = excess * strength * alpha;
        component.forEach(function(node) {
          node.vx += ux * pull;
          node.vy += uy * pull;
        });
      }
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
    createComponentTetherForce: createComponentTetherForce,
    distributeClusterCenters: distributeClusterCenters,
    pullNodesInsideBounds: pullNodesInsideBounds,
    spreadNodesInsideBounds: spreadNodesInsideBounds,
  };
});
