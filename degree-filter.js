(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DramatisDegreeFilter = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function endpointId(endpoint) {
    if (!endpoint) return null;
    if (typeof endpoint === 'object') return endpoint.id || null;
    return endpoint;
  }

  function calculateNodeDegrees(nodes, links, options) {
    var opts = options || {};
    var degrees = new Map();
    var knownIds = new Set();

    (nodes || []).forEach(function(node) {
      if (!node || !node.id) return;
      degrees.set(node.id, 0);
      knownIds.add(node.id);
    });

    (links || []).forEach(function(link) {
      if (!link) return;
      if (link.hidden && !opts.includeHiddenLinks) return;

      var source = endpointId(link.source);
      var target = endpointId(link.target);
      if (!knownIds.has(source) || !knownIds.has(target)) return;

      degrees.set(source, degrees.get(source) + 1);
      if (target !== source) degrees.set(target, degrees.get(target) + 1);
    });

    return degrees;
  }

  function matchesOperator(value, operator, threshold) {
    switch (operator) {
      case '<=': return value <= threshold;
      case '<': return value < threshold;
      case '=':
      case '==': return value === threshold;
      case '>=': return value >= threshold;
      case '>': return value > threshold;
      default: return value <= threshold;
    }
  }

  function getNodesMatchingDegree(nodes, links, operator, threshold, options) {
    var degrees = calculateNodeDegrees(nodes, links, options);
    var limit = Number.isFinite(threshold) ? threshold : 1;
    return (nodes || []).filter(function(node) {
      if (!node || !node.id) return false;
      return matchesOperator(degrees.get(node.id) || 0, operator || '<=', limit);
    });
  }

  return {
    calculateNodeDegrees: calculateNodeDegrees,
    getNodesMatchingDegree: getNodesMatchingDegree,
  };
});
