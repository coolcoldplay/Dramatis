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

  return {
    viewportBounds: viewportBounds,
    clampNodesToViewport: clampNodesToViewport,
  };
});
