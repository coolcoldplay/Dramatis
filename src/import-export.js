(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DramatisImportExport = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function cloneLinkTypes(defaults, imported) {
    var base = defaults || {};
    var data = imported || {};
    var result = {
      relation: Object.assign({}, base.relation || {}, data.relation || {}),
      action: Object.assign({}, base.action || {}, data.action || {}),
    };
    ['relation', 'action'].forEach(function(type) {
      if (result[type].labelFontSize == null) result[type].labelFontSize = 11;
      if (result[type].labelOrientation == null) result[type].labelOrientation = 'horizontal';
    });
    return result;
  }

  function maxIdNum(items, prefix) {
    return Math.max(0, ...(items || [])
      .map(function(item) { return item && item.id; })
      .filter(function(id) { return typeof id === 'string' && id.startsWith(prefix); })
      .map(function(id) { return parseInt(id.slice(prefix.length), 10); })
      .filter(Number.isFinite));
  }

  function calculateNextId(dataNextId, nodes, links, tagCategories) {
    var maxId = 0;
    maxId = Math.max(maxId, maxIdNum(nodes, 'N'));
    maxId = Math.max(maxId, maxIdNum(links, 'L'));
    maxId = Math.max(maxId, maxIdNum(tagCategories, 'C'));
    (tagCategories || []).forEach(function(category) {
      maxId = Math.max(maxId, maxIdNum(category.tags, 'T'));
    });
    return Math.max(dataNextId || 1, maxId + 1);
  }

  function normalizeClusterSpacing(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) return 1;
    return Math.min(2.4, Math.max(0.5, n));
  }

  function normalizeTopologySizing(value) {
    var input = value || {};
    var mode = input.mode === 'degree' || input.mode === 'connectivity' ? input.mode : 'none';
    var strength = Number(input.strength);
    if (!Number.isFinite(strength)) strength = mode === 'none' ? 0.65 : 0.65;
    return {
      mode: mode,
      strength: Math.min(1, Math.max(0, strength)),
    };
  }

  function normalizeImportedGraph(data, options) {
    var input = data || {};
    var opts = options || {};
    var normalizeGraphStyle = opts.normalizeGraphStyle || function(style) { return style || {}; };
    var graphIndex = opts.graphIndex;

    var nodes = (input.nodes || []).map(function(node) {
      return Object.assign({}, node, {
        notes: node.notes || '',
        tags: node.tags || {},
        episodes: node.episodes || [],
        hidden: node.hidden || false,
        fx: node.fx != null ? node.fx : null,
        fy: node.fy != null ? node.fy : null,
      });
    });

    var links = (input.links || []).map(function(link) {
      return Object.assign({}, link, {
        type: link.type || (link.directed !== false ? 'action' : 'relation'),
        episodes: link.episodes || [],
        notes: link.notes || '',
        hidden: link.hidden || false,
      });
    });

    var resolved = graphIndex && graphIndex.resolveLinkEndpoints
      ? graphIndex.resolveLinkEndpoints(nodes, links)
      : { links: links.filter(function(link) { return link.source && link.target; }), dropped: [] };
    links = resolved.links;

    var tagCategories = (input.tagCategories || []).map(function(category) {
      return Object.assign({}, category, {
        visible: category.visible !== false,
        tags: category.tags || [],
      });
    });

    return {
      nodes: nodes,
      links: links,
      droppedLinks: resolved.dropped || [],
      tagCategories: tagCategories,
      nextId: calculateNextId(input.nextId, nodes, links, tagCategories),
      graphStyle: normalizeGraphStyle(input.graphStyle),
      graphBackgroundColor: input.graphBackgroundColor || (input.graphBackground && input.graphBackground.value) || '#0d0e12',
      linkTypes: cloneLinkTypes(opts.defaultLinkTypes, input.linkTypes),
      clusterSpacing: normalizeClusterSpacing(input.clusterSpacing),
      topologySizing: normalizeTopologySizing(input.topologySizing),
      forceConfig: input.forceConfig || {
        centerStrength: 0.05,
        chargeStrength: -650,
        linkStrength: 0.5,
        linkDistance: 170,
      },
    };
  }

  return {
    calculateNextId: calculateNextId,
    cloneLinkTypes: cloneLinkTypes,
    normalizeImportedGraph: normalizeImportedGraph,
  };
});
