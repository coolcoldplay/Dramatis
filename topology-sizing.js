(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DramatisTopologySizing = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function endpointId(endpoint) {
    if (!endpoint) return null;
    if (typeof endpoint === 'object') return endpoint.id || null;
    return endpoint;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function normalizeTopologySizing(options) {
    var input = options || {};
    var mode = input.mode === 'degree' || input.mode === 'connectivity' ? input.mode : 'none';
    var strength = Number(input.strength);
    if (!Number.isFinite(strength)) strength = mode === 'none' ? 0 : 0.65;
    return {
      mode: mode,
      strength: clamp(strength, 0, 1),
    };
  }

  function buildTopologyMetrics(nodes, links) {
    var degree = new Map();
    var adjacency = new Map();
    (nodes || []).forEach(function(node) {
      if (!node || !node.id) return;
      degree.set(node.id, 0);
      adjacency.set(node.id, new Set());
    });

    (links || []).forEach(function(link) {
      if (!link || link.hidden) return;
      var sourceId = endpointId(link.source);
      var targetId = endpointId(link.target);
      if (!adjacency.has(sourceId) || !adjacency.has(targetId)) return;
      degree.set(sourceId, (degree.get(sourceId) || 0) + 1);
      if (targetId !== sourceId) degree.set(targetId, (degree.get(targetId) || 0) + 1);
      adjacency.get(sourceId).add(targetId);
      adjacency.get(targetId).add(sourceId);
    });

    var connectivity = new Map();
    var visited = new Set();
    adjacency.forEach(function(_, nodeId) {
      if (visited.has(nodeId)) return;
      var stack = [nodeId];
      var component = [];
      visited.add(nodeId);
      while (stack.length) {
        var current = stack.pop();
        component.push(current);
        adjacency.get(current).forEach(function(next) {
          if (visited.has(next)) return;
          visited.add(next);
          stack.push(next);
        });
      }
      component.forEach(function(id) {
        connectivity.set(id, component.length);
      });
    });

    return {
      degree: degree,
      connectivity: connectivity,
    };
  }

  function metricRange(map) {
    var values = Array.from((map || new Map()).values()).filter(Number.isFinite);
    if (!values.length) return { min: 0, max: 0 };
    return {
      min: Math.min.apply(null, values),
      max: Math.max.apply(null, values),
    };
  }

  function calculateNodeRadius(nodeId, metrics, options) {
    var opts = normalizeTopologySizing(options);
    var baseRadius = Math.max(1, Number(options && options.baseRadius) || 31);
    if (opts.mode === 'none') return baseRadius;
    var metricMap = opts.mode === 'connectivity' ? metrics.connectivity : metrics.degree;
    var range = metricRange(metricMap);
    var value = metricMap.get(nodeId) || 0;
    var normalized = range.max > range.min ? (value - range.min) / (range.max - range.min) : (value > 0 ? 1 : 0);
    var maxBoost = 0.85 * opts.strength;
    var minScale = 1 - 0.22 * opts.strength;
    var scale = minScale + normalized * (1 + maxBoost - minScale);
    return Math.round(baseRadius * scale * 10) / 10;
  }

  function nodeRadiusMap(nodes, metrics, options) {
    var map = new Map();
    (nodes || []).forEach(function(node) {
      if (!node || !node.id) return;
      map.set(node.id, calculateNodeRadius(node.id, metrics, options));
    });
    return map;
  }

  return {
    buildTopologyMetrics: buildTopologyMetrics,
    calculateNodeRadius: calculateNodeRadius,
    nodeRadiusMap: nodeRadiusMap,
    normalizeTopologySizing: normalizeTopologySizing,
  };
});
