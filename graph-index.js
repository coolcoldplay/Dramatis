(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DramatisGraphIndex = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function endpointId(endpoint) {
    if (!endpoint) return null;
    if (typeof endpoint === 'object') return endpoint.id || null;
    return endpoint;
  }

  function resolveLinkEndpoints(nodes, links) {
    var nodesById = new Map();
    (nodes || []).forEach(function(node) {
      if (node && node.id) nodesById.set(node.id, node);
    });

    var resolved = [];
    var dropped = [];
    (links || []).forEach(function(link) {
      var source = nodesById.get(endpointId(link && link.source));
      var target = nodesById.get(endpointId(link && link.target));
      if (!source || !target) {
        dropped.push(link);
        return;
      }
      link.source = source;
      link.target = target;
      resolved.push(link);
    });

    return { links: resolved, dropped: dropped, nodesById: nodesById };
  }

  function addToMapList(map, key, value) {
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(value);
  }

  function buildGraphIndex(nodes, links) {
    var nodesById = new Map();
    var degrees = new Map();
    var linksByNodeId = new Map();
    var linksByNodeIdIncludingHidden = new Map();

    (nodes || []).forEach(function(node) {
      if (!node || !node.id) return;
      nodesById.set(node.id, node);
      degrees.set(node.id, 0);
      linksByNodeId.set(node.id, []);
      linksByNodeIdIncludingHidden.set(node.id, []);
    });

    (links || []).forEach(function(link) {
      if (!link) return;
      var sourceId = endpointId(link.source);
      var targetId = endpointId(link.target);
      if (!nodesById.has(sourceId) || !nodesById.has(targetId)) return;

      addToMapList(linksByNodeIdIncludingHidden, sourceId, link);
      if (targetId !== sourceId) addToMapList(linksByNodeIdIncludingHidden, targetId, link);

      if (link.hidden) return;
      degrees.set(sourceId, (degrees.get(sourceId) || 0) + 1);
      if (targetId !== sourceId) degrees.set(targetId, (degrees.get(targetId) || 0) + 1);
      addToMapList(linksByNodeId, sourceId, link);
      if (targetId !== sourceId) addToMapList(linksByNodeId, targetId, link);
    });

    return {
      nodesById: nodesById,
      degrees: degrees,
      linksByNodeId: linksByNodeId,
      linksByNodeIdIncludingHidden: linksByNodeIdIncludingHidden,
    };
  }

  function episodeKey(ep) {
    if (!ep) return '';
    return [ep.season, ep.episode, ep.sequence || 0].join('-');
  }

  function firstEpisodeIndex(episodes, episodeList) {
    if (!episodes || !episodes.length) return Infinity;
    var indexByKey = new Map();
    (episodeList || []).forEach(function(ep, index) {
      indexByKey.set(episodeKey(ep), index);
    });

    var min = Infinity;
    episodes.forEach(function(ep) {
      var index = indexByKey.get(episodeKey(ep));
      if (index != null && index < min) min = index;
    });
    return min;
  }

  return {
    buildGraphIndex: buildGraphIndex,
    endpointId: endpointId,
    firstEpisodeIndex: firstEpisodeIndex,
    resolveLinkEndpoints: resolveLinkEndpoints,
  };
});
