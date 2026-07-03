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
      var tagId = node && node.tags && category ? node.tags[category.id] : null;
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

  return {
    buildClusterTargets: buildClusterTargets,
    createBoundaryForce: createBoundaryForce,
    createClusterForce: createClusterForce,
    distributeClusterCenters: distributeClusterCenters,
    pullNodesInsideBounds: pullNodesInsideBounds,
  };
});
