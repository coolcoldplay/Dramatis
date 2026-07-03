(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DramatisViewportTools = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function safeNumber(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function viewportBounds(transform, size, padding) {
    var t = transform || {};
    var s = size || {};
    var k = safeNumber(t.k, 1) || 1;
    var tx = safeNumber(t.x, 0);
    var ty = safeNumber(t.y, 0);
    var width = Math.max(0, safeNumber(s.width, 0));
    var height = Math.max(0, safeNumber(s.height, 0));
    var pad = Math.max(0, safeNumber(padding, 0));

    var left = Math.min(pad, width / 2);
    var right = Math.max(left, width - pad);
    var top = Math.min(pad, height / 2);
    var bottom = Math.max(top, height - pad);

    return {
      minX: (left - tx) / k,
      maxX: (right - tx) / k,
      minY: (top - ty) / k,
      maxY: (bottom - ty) / k,
    };
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function clampNodesToViewport(nodes, transform, size, padding) {
    var bounds = viewportBounds(transform, size, padding);
    var changed = 0;

    (nodes || []).forEach(function(node) {
      if (!node) return;
      var oldX = safeNumber(node.x, 0);
      var oldY = safeNumber(node.y, 0);
      var nextX = clamp(oldX, bounds.minX, bounds.maxX);
      var nextY = clamp(oldY, bounds.minY, bounds.maxY);

      if (nextX !== oldX || nextY !== oldY) changed += 1;

      node.x = nextX;
      node.y = nextY;
      node.fx = nextX;
      node.fy = nextY;
    });

    return changed;
  }

  function hasNodePosition(node) {
    if (!node) return false;
    return (Number.isFinite(node.x) && Number.isFinite(node.y))
      || (Number.isFinite(node.fx) && Number.isFinite(node.fy));
  }

  function seedMissingNodePositions(nodes, transform, size, options) {
    var list = (nodes || []).filter(function(node) {
      return node && !hasNodePosition(node);
    });
    if (!list.length) return 0;

    var opts = options || {};
    var bounds = viewportBounds(transform, size, opts.padding == null ? 120 : opts.padding);
    var width = Math.max(1, bounds.maxX - bounds.minX);
    var height = Math.max(1, bounds.maxY - bounds.minY);
    var centerX = (bounds.minX + bounds.maxX) / 2;
    var centerY = (bounds.minY + bounds.maxY) / 2;
    var maxRadius = Math.max(40, Math.min(width, height) * (opts.radiusRatio == null ? 0.42 : opts.radiusRatio));
    var goldenAngle = Math.PI * (3 - Math.sqrt(5));

    list.forEach(function(node, index) {
      var progress = Math.sqrt((index + 0.5) / list.length);
      var radius = maxRadius * progress;
      var angle = index * goldenAngle;
      node.x = clamp(centerX + Math.cos(angle) * radius, bounds.minX, bounds.maxX);
      node.y = clamp(centerY + Math.sin(angle) * radius, bounds.minY, bounds.maxY);
      node.vx = 0;
      node.vy = 0;
    });

    return list.length;
  }

  return {
    viewportBounds: viewportBounds,
    clampNodesToViewport: clampNodesToViewport,
    seedMissingNodePositions: seedMissingNodePositions,
  };
});
