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

  return {
    connectedNodeIds: connectedNodeIds,
    endpointId: endpointId,
    linkTouchesNode: linkTouchesNode,
  };
});
