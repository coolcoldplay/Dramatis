(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DramatisLinkLabelDeclutter = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function halfWidth(box, padding) {
    return Math.max(1, (Number(box.width) || 0) / 2 + padding);
  }

  function halfHeight(box, padding) {
    return Math.max(1, (Number(box.height) || 0) / 2 + padding);
  }

  function labelBoxesOverlap(a, b, padding) {
    var pad = Math.max(0, Number(padding) || 0);
    var dx = Math.abs((Number(a.x) || 0) - (Number(b.x) || 0));
    var dy = Math.abs((Number(a.y) || 0) - (Number(b.y) || 0));
    return dx < halfWidth(a, pad) + halfWidth(b, pad) &&
      dy < halfHeight(a, pad) + halfHeight(b, pad);
  }

  function clampLabelToAnchor(item, maxShift) {
    var sx = item.x - item.anchorX;
    var sy = item.y - item.anchorY;
    var mag = Math.sqrt(sx * sx + sy * sy);
    if (mag <= maxShift) return;
    var scale = maxShift / mag;
    item.x = item.anchorX + sx * scale;
    item.y = item.anchorY + sy * scale;
  }

  function resolveLabelOffsets(labels, options) {
    var opts = options || {};
    var padding = Math.max(0, Number(opts.padding) || 8);
    var iterations = Math.max(1, Math.floor(Number(opts.iterations) || 80));
    var maxShift = Math.max(12, Number(opts.maxShift) || 130);
    var anchorStrength = Math.max(0, Math.min(0.2, Number(opts.anchorStrength) || 0.015));
    var items = (labels || []).filter(function(label) {
      return label && label.linkId && Number.isFinite(label.x) && Number.isFinite(label.y);
    }).map(function(label, index) {
      var shiftX = Number(label.shiftX) || 0;
      var shiftY = Number(label.shiftY) || 0;
      var anchorX = Number.isFinite(label.anchorX) ? label.anchorX : label.x - shiftX;
      var anchorY = Number.isFinite(label.anchorY) ? label.anchorY : label.y - shiftY;
      return {
        index: index,
        linkId: label.linkId,
        anchorX: anchorX,
        anchorY: anchorY,
        x: Number(label.x) || anchorX,
        y: Number(label.y) || anchorY,
        width: Math.max(2, Number(label.width) || 2),
        height: Math.max(2, Number(label.height) || 2),
      };
    });

    for (var iteration = 0; iteration < iterations; iteration += 1) {
      var moved = 0;
      for (var i = 0; i < items.length; i += 1) {
        for (var j = i + 1; j < items.length; j += 1) {
          var a = items[i];
          var b = items[j];
          var dx = a.x - b.x;
          var dy = a.y - b.y;
          var overlapX = halfWidth(a, padding) + halfWidth(b, padding) - Math.abs(dx);
          if (overlapX <= 0) continue;
          var overlapY = halfHeight(a, padding) + halfHeight(b, padding) - Math.abs(dy);
          if (overlapY <= 0) continue;

          if (overlapX < overlapY) {
            var signX = dx === 0 ? (a.index % 2 === 0 ? 1 : -1) : Math.sign(dx);
            var moveX = (overlapX / 2 + 0.6) * signX;
            a.x += moveX;
            b.x -= moveX;
            moved += Math.abs(moveX) * 2;
          } else {
            var signY = dy === 0 ? (a.index % 2 === 0 ? 1 : -1) : Math.sign(dy);
            var moveY = (overlapY / 2 + 0.6) * signY;
            a.y += moveY;
            b.y -= moveY;
            moved += Math.abs(moveY) * 2;
          }
        }
      }

      items.forEach(function(item) {
        if (anchorStrength > 0) {
          item.x += (item.anchorX - item.x) * anchorStrength;
          item.y += (item.anchorY - item.y) * anchorStrength;
        }
        clampLabelToAnchor(item, maxShift);
      });

      if (moved < 0.1) break;
    }

    var offsets = new Map();
    items.forEach(function(item) {
      offsets.set(item.linkId, {
        x: item.x - item.anchorX,
        y: item.y - item.anchorY,
      });
    });
    return offsets;
  }

  function addImpulse(map, nodeId, x, y) {
    if (!nodeId) return;
    var current = map.get(nodeId) || { x: 0, y: 0 };
    current.x += x;
    current.y += y;
    map.set(nodeId, current);
  }

  function capImpulses(impulses, maxNodeImpulse) {
    impulses.forEach(function(impulse) {
      var mag = Math.sqrt(impulse.x * impulse.x + impulse.y * impulse.y);
      if (mag <= maxNodeImpulse) return;
      var scale = maxNodeImpulse / mag;
      impulse.x *= scale;
      impulse.y *= scale;
    });
    return impulses;
  }

  function calculateLabelDeclutterImpulses(labels, options) {
    var opts = options || {};
    var padding = Math.max(0, Number(opts.padding) || 8);
    var strength = Math.max(0, Number(opts.strength) || 1);
    var maxPairs = Math.max(1, Number(opts.maxPairs) || 1600);
    var maxNodeImpulse = Math.max(1, Number(opts.maxNodeImpulse) || 140);
    var impulses = new Map();
    var pairCount = 0;
    var items = (labels || []).filter(function(label) {
      return label && label.linkId && label.sourceId && label.targetId &&
        Number.isFinite(label.x) && Number.isFinite(label.y);
    });

    for (var i = 0; i < items.length; i += 1) {
      for (var j = i + 1; j < items.length; j += 1) {
        if (pairCount >= maxPairs) return capImpulses(impulses, maxNodeImpulse);
        var a = items[i];
        var b = items[j];
        if (!labelBoxesOverlap(a, b, padding)) continue;
        pairCount += 1;

        var dx = a.x - b.x;
        var dy = a.y - b.y;
        var len = Math.sqrt(dx * dx + dy * dy);
        if (!len) {
          dx = ((i % 3) - 1) || 1;
          dy = ((j % 3) - 1) || 1;
          len = Math.sqrt(dx * dx + dy * dy);
        }
        var overlapX = halfWidth(a, padding) + halfWidth(b, padding) - Math.abs(a.x - b.x);
        var overlapY = halfHeight(a, padding) + halfHeight(b, padding) - Math.abs(a.y - b.y);
        var amount = Math.min(80, Math.max(12, Math.min(overlapX, overlapY) * strength));
        var ux = dx / len;
        var uy = dy / len;
        var ax = ux * amount;
        var ay = uy * amount;

        addImpulse(impulses, a.sourceId, ax, ay);
        addImpulse(impulses, a.targetId, ax, ay);
        addImpulse(impulses, b.sourceId, -ax, -ay);
        addImpulse(impulses, b.targetId, -ax, -ay);
      }
    }

    return capImpulses(impulses, maxNodeImpulse);
  }

  function createImpulseForce(impulses, options) {
    var nodes = [];
    var opts = options || {};
    var strength = Math.max(0, Number(opts.strength) || 0.08);

    function force(alpha) {
      nodes.forEach(function(node) {
        if (!node || !node.id) return;
        var impulse = impulses.get(node.id);
        if (!impulse) return;
        node.vx += impulse.x * strength * alpha;
        node.vy += impulse.y * strength * alpha;
      });
    }

    force.initialize = function(nextNodes) {
      nodes = nextNodes || [];
    };

    return force;
  }

  return {
    calculateLabelDeclutterImpulses: calculateLabelDeclutterImpulses,
    createImpulseForce: createImpulseForce,
    labelBoxesOverlap: labelBoxesOverlap,
    resolveLabelOffsets: resolveLabelOffsets,
  };
});
