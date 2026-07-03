(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DramatisGraphHighlight = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function endpointId(endpoint) {
    return endpoint && typeof endpoint === 'object' ? endpoint.id : endpoint;
  }

  function linkTouchesNode(link, nodeId) {
    if (!link || !nodeId) return false;
    return endpointId(link.source) === nodeId || endpointId(link.target) === nodeId;
  }

  function connectedNodeIds(links, nodeId) {
    var ids = new Set();
    if (!nodeId) return ids;
    ids.add(nodeId);
    (links || []).forEach(function(link) {
      var sourceId = endpointId(link && link.source);
      var targetId = endpointId(link && link.target);
      if (sourceId === nodeId || targetId === nodeId) {
        if (sourceId) ids.add(sourceId);
        if (targetId) ids.add(targetId);
      }
    });
    return ids;
  }

  function neighborhoodFromIndex(index, nodeId) {
    var nodeIds = new Set();
    var linkIds = new Set();
    if (!nodeId) return { nodeIds: nodeIds, linkIds: linkIds };
    nodeIds.add(nodeId);

    var links = index && index.linksByNodeId && index.linksByNodeId.get
      ? (index.linksByNodeId.get(nodeId) || [])
      : [];
    links.forEach(function(link) {
      var sourceId = endpointId(link && link.source);
      var targetId = endpointId(link && link.target);
      if (sourceId) nodeIds.add(sourceId);
      if (targetId) nodeIds.add(targetId);
      if (link && link.id) linkIds.add(link.id);
    });

    return { nodeIds: nodeIds, linkIds: linkIds };
  }

  function createClassDiff(previous, next) {
    var prev = previous || new Set();
    var current = next || new Set();
    var add = [];
    var remove = [];
    var keep = [];

    current.forEach(function(id) {
      if (prev.has(id)) keep.push(id);
      else add.push(id);
    });
    prev.forEach(function(id) {
      if (!current.has(id)) remove.push(id);
    });

    add.sort();
    remove.sort();
    keep.sort();
    return { add: add, remove: remove, keep: keep };
  }

  return {
    connectedNodeIds: connectedNodeIds,
    createClassDiff: createClassDiff,
    endpointId: endpointId,
    linkTouchesNode: linkTouchesNode,
    neighborhoodFromIndex: neighborhoodFromIndex,
  };
});
