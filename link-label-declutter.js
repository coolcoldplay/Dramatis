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

  function addDistanceBoost(map, linkId, amount, maxLinkDistanceBoost) {
    if (!linkId) return;
    var current = Number(map.get(linkId)) || 0;
    map.set(linkId, Math.min(maxLinkDistanceBoost, current + amount));
  }

  function linkUnit(label) {
    var sx = Number(label.sourceX);
    var sy = Number(label.sourceY);
    var tx = Number(label.targetX);
    var ty = Number(label.targetY);
    if (Number.isFinite(sx) && Number.isFinite(sy) && Number.isFinite(tx) && Number.isFinite(ty)) {
      var dx = tx - sx;
      var dy = ty - sy;
      var len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0.001) return { x: dx / len, y: dy / len };
    }
    return { x: 1, y: 0 };
  }

  function pushLinkLonger(impulses, label, amount) {
    var unit = linkUnit(label);
    addImpulse(impulses, label.sourceId, -unit.x * amount, -unit.y * amount);
    addImpulse(impulses, label.targetId, unit.x * amount, unit.y * amount);
  }

  function pushLinkCenter(impulses, label, x, y) {
    addImpulse(impulses, label.sourceId, x, y);
    addImpulse(impulses, label.targetId, x, y);
  }

  function normalizeLabelItems(labels) {
    return (labels || []).filter(function(label) {
      return label && label.linkId && label.sourceId && label.targetId &&
        Number.isFinite(label.x) && Number.isFinite(label.y);
    }).map(function(label) {
      return {
        linkId: label.linkId,
        sourceId: label.sourceId,
        targetId: label.targetId,
        x: Number(label.x) || 0,
        y: Number(label.y) || 0,
        width: Math.max(2, Number(label.width) || 2),
        height: Math.max(2, Number(label.height) || 2),
        sourceX: Number(label.sourceX),
        sourceY: Number(label.sourceY),
        targetX: Number(label.targetX),
        targetY: Number(label.targetY),
      };
    });
  }

  function normalizeObstacleItems(obstacles) {
    return (obstacles || []).filter(function(obstacle) {
      return obstacle && Number.isFinite(obstacle.x) && Number.isFinite(obstacle.y);
    }).map(function(obstacle, index) {
      return {
        id: obstacle.id || ('obstacle-' + index),
        nodeId: obstacle.nodeId || obstacle.id || '',
        x: Number(obstacle.x) || 0,
        y: Number(obstacle.y) || 0,
        width: Math.max(2, Number(obstacle.width) || 2),
        height: Math.max(2, Number(obstacle.height) || 2),
      };
    });
  }

  function calculateLabelForcePlan(labels, options) {
    var opts = options || {};
    var padding = Math.max(0, Number(opts.padding) || 8);
    var strength = Math.max(0, Number(opts.strength) || 1);
    var maxPairs = Math.max(1, Number(opts.maxPairs) || 2400);
    var maxNodeImpulse = Math.max(1, Number(opts.maxNodeImpulse) || 160);
    var maxLinkDistanceBoost = Math.max(1, Number(opts.maxLinkDistanceBoost) || 260);
    var impulses = new Map();
    var linkDistanceBoosts = new Map();
    var items = normalizeLabelItems(labels);
    var obstacles = normalizeObstacleItems(opts.obstacles);
    var pairCount = 0;
    var overlapCount = 0;

    for (var i = 0; i < items.length; i += 1) {
      for (var j = i + 1; j < items.length; j += 1) {
        if (pairCount >= maxPairs) {
          return {
            impulses: capImpulses(impulses, maxNodeImpulse),
            linkDistanceBoosts: linkDistanceBoosts,
            overlapCount: overlapCount,
          };
        }

        var a = items[i];
        var b = items[j];
        if (!labelBoxesOverlap(a, b, padding)) continue;
        pairCount += 1;
        overlapCount += 1;

        var dx = a.x - b.x;
        var dy = a.y - b.y;
        var len = Math.sqrt(dx * dx + dy * dy);
        if (!len) {
          dx = (i % 2 === 0 ? 1 : -1);
          dy = (j % 2 === 0 ? 1 : -1);
          len = Math.sqrt(dx * dx + dy * dy);
        }

        var overlapX = halfWidth(a, padding) + halfWidth(b, padding) - Math.abs(a.x - b.x);
        var overlapY = halfHeight(a, padding) + halfHeight(b, padding) - Math.abs(a.y - b.y);
        var overlap = Math.max(0, Math.min(overlapX, overlapY));
        var amount = Math.max(10, Math.min(90, overlap * strength));
        var ux = dx / len;
        var uy = dy / len;
        var centerAmount = amount * 0.34;
        var lengthenAmount = amount * 0.72;
        var labelWidthNeed = Math.max(a.width, b.width) * 0.92;
        var distanceBoost = Math.max(90, Math.min(maxLinkDistanceBoost, (labelWidthNeed + overlap * 2.2) * strength));

        pushLinkCenter(impulses, a, ux * centerAmount, uy * centerAmount);
        pushLinkCenter(impulses, b, -ux * centerAmount, -uy * centerAmount);
        pushLinkLonger(impulses, a, lengthenAmount);
        pushLinkLonger(impulses, b, lengthenAmount);
        addDistanceBoost(linkDistanceBoosts, a.linkId, distanceBoost, maxLinkDistanceBoost);
        addDistanceBoost(linkDistanceBoosts, b.linkId, distanceBoost, maxLinkDistanceBoost);
      }
    }

    for (var li = 0; li < items.length; li += 1) {
      var label = items[li];
      for (var oi = 0; oi < obstacles.length; oi += 1) {
        if (pairCount >= maxPairs) {
          return {
            impulses: capImpulses(impulses, maxNodeImpulse),
            linkDistanceBoosts: linkDistanceBoosts,
            overlapCount: overlapCount,
          };
        }
        var obstacle = obstacles[oi];
        if (!labelBoxesOverlap(label, obstacle, padding)) continue;
        pairCount += 1;
        overlapCount += 1;

        var odx = label.x - obstacle.x;
        var ody = label.y - obstacle.y;
        var olen = Math.sqrt(odx * odx + ody * ody);
        if (!olen) {
          odx = (li % 2 === 0 ? 1 : -1);
          ody = (oi % 2 === 0 ? 1 : -1);
          olen = Math.sqrt(odx * odx + ody * ody);
        }
        var overlapOX = halfWidth(label, padding) + halfWidth(obstacle, padding) - Math.abs(label.x - obstacle.x);
        var overlapOY = halfHeight(label, padding) + halfHeight(obstacle, padding) - Math.abs(label.y - obstacle.y);
        var obstacleOverlap = Math.max(0, Math.min(overlapOX, overlapOY));
        var obstacleAmount = Math.max(14, Math.min(90, obstacleOverlap * strength));
        var oux = odx / olen;
        var ouy = ody / olen;
        var obstacleDistanceBoost = Math.max(90, Math.min(maxLinkDistanceBoost, (label.width * 0.85 + obstacleOverlap * 2.4) * strength));

        pushLinkCenter(impulses, label, oux * obstacleAmount, ouy * obstacleAmount);
        pushLinkLonger(impulses, label, obstacleAmount * 0.55);
        if (obstacle.nodeId) addImpulse(impulses, obstacle.nodeId, -oux * obstacleAmount * 0.5, -ouy * obstacleAmount * 0.5);
        addDistanceBoost(linkDistanceBoosts, label.linkId, obstacleDistanceBoost, maxLinkDistanceBoost);
      }
    }

    return {
      impulses: capImpulses(impulses, maxNodeImpulse),
      linkDistanceBoosts: linkDistanceBoosts,
      overlapCount: overlapCount,
    };
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
    calculateLabelForcePlan: calculateLabelForcePlan,
    calculateLabelDeclutterImpulses: calculateLabelDeclutterImpulses,
    createImpulseForce: createImpulseForce,
    labelBoxesOverlap: labelBoxesOverlap,
  };
});
