(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DramatisFamilyRenderer = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  var KNOWN_KINDS = new Set(['union', 'parentage', 'kinship', 'succession', 'other']);
  var KNOWN_CERTAINTY = new Set(['confirmed', 'probable', 'rumored', 'disputed', 'unknown']);
  var KNOWN_SUBTYPES = new Set([
    'marriage', 'partnership', 'betrothal', 'affair', 'political_union', 'former_union',
    'biological', 'adoptive', 'legal', 'guardian', 'step', 'surrogate', 'supernatural',
    'sibling', 'half_sibling', 'twin', 'step_sibling',
    'heir', 'claimant', 'designated_successor', 'other',
  ]);

  function safeClass(value, known, fallback) {
    var normalized = String(value || '').trim();
    return known.has(normalized) ? normalized : fallback;
  }

  function relationClass(relation) {
    var value = relation || {};
    return [
      'family-edge',
      safeClass(value.kind, KNOWN_KINDS, 'other'),
      safeClass(value.subtype, KNOWN_SUBTYPES, 'other'),
      safeClass(value.certainty, KNOWN_CERTAINTY, 'unknown'),
    ].join(' ');
  }

  function nodeLod(scale) {
    var value = Number(scale);
    if (!Number.isFinite(value) || value < 0.55) return 'far';
    if (value < 1.05) return 'medium';
    return 'near';
  }

  function ellipsize(value, maximum) {
    var chars = Array.from(String(value || ''));
    if (chars.length <= maximum) return chars.join('');
    if (maximum <= 1) return '…';
    return chars.slice(0, maximum - 1).join('') + '…';
  }

  function wrapFamilyName(value, maxCharacters) {
    var text = String(value || '').trim().replace(/\s+/g, ' ');
    var maximum = Math.max(3, Number(maxCharacters) || 14);
    if (!text) return ['?'];
    var characters = Array.from(text);
    if (characters.length <= maximum) return [text];
    if (!/\s/.test(text)) {
      var first = characters.slice(0, maximum).join('');
      var rest = characters.slice(maximum).join('');
      return [first, ellipsize(rest, maximum)];
    }
    var words = text.split(' ');
    var firstLine = '';
    var cursor = 0;
    while (cursor < words.length) {
      var candidate = firstLine ? firstLine + ' ' + words[cursor] : words[cursor];
      if (Array.from(candidate).length > maximum) break;
      firstLine = candidate;
      cursor += 1;
    }
    if (!firstLine) {
      firstLine = ellipsize(words[0], maximum);
      cursor = 1;
    }
    var secondLine = words.slice(cursor).join(' ');
    return secondLine ? [firstLine, ellipsize(secondLine, maximum)] : [firstLine];
  }

  function pointsToPath(points) {
    if (!Array.isArray(points) || !points.length || points.some(function(point) {
      return !point || !Number.isFinite(point.x) || !Number.isFinite(point.y);
    })) return '';
    return points.map(function(point, index) {
      return (index ? 'L' : 'M') + point.x + ',' + point.y;
    }).join('');
  }

  function initials(name) {
    var text = String(name || '?').trim();
    var words = text.split(/\s+/).filter(Boolean);
    if (words.length > 1) return (Array.from(words[0])[0] + Array.from(words[words.length - 1])[0]).toUpperCase();
    return Array.from(text).slice(0, 2).join('').toUpperCase();
  }

  function metadataLine(node) {
    if (!node) return '';
    if (node.generationLabel) return String(node.generationLabel);
    if (node.birth || node.death) {
      var birth = node.birth && (node.birth.label || node.birth.year);
      var death = node.death && (node.death.label || node.death.year);
      if (birth || death) return String(birth || '?') + '–' + String(death || '');
    }
    if (Array.isArray(node.titles) && node.titles.length) return String(node.titles[0]);
    if (Array.isArray(node.aliases) && node.aliases.length) return String(node.aliases[0]);
    return '';
  }

  function createFamilyRenderer(options) {
    var opts = options || {};
    var d3 = opts.d3;
    var svgElement = opts.svg;
    var callbacks = opts.callbacks || {};
    if (!d3 || !svgElement) throw new Error('createFamilyRenderer requires svg and d3');

    var svg = d3.select(svgElement);
    var defs = svg.selectAll('defs.family-defs').data([null]).join('defs').attr('class', 'family-defs');
    defs.html(
      '<marker id="family-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
      + '<path d="M0,0 L10,5 L0,10 z"></path></marker>'
      + '<pattern id="family-grid" width="24" height="24" patternUnits="userSpaceOnUse">'
      + '<path d="M24 0H0V24" fill="none"></path></pattern>'
    );
    svg.selectAll('rect.family-grid').data([null]).join('rect')
      .attr('class', 'family-grid').attr('width', '100%').attr('height', '100%').attr('fill', 'url(#family-grid)');
    var rootLayer = svg.selectAll('g.family-root').data([null]).join('g').attr('class', 'family-root');
    var edgeLayer = rootLayer.selectAll('g.family-edge-layer').data([null]).join('g').attr('class', 'family-edge-layer');
    var hubLayer = rootLayer.selectAll('g.family-hub-layer').data([null]).join('g').attr('class', 'family-hub-layer');
    var nodeLayer = rootLayer.selectAll('g.family-node-layer').data([null]).join('g').attr('class', 'family-node-layer');
    var currentLayout = null;
    var currentModel = null;
    var destroyed = false;
    var nodeElements = new Map();
    var edgeElements = new Map();
    var hubElements = new Map();
    var currentLod = '';

    function updateLod(scale) {
      var next = nodeLod(scale);
      if (next === currentLod) return;
      currentLod = next;
      svg.attr('data-family-lod', next);
      if (callbacks.onLodChange) callbacks.onLodChange(next);
    }

    var zoom = d3.zoom().scaleExtent([0.02, 4]).on('zoom.family', function(event) {
      rootLayer.attr('transform', event.transform);
      updateLod(event.transform.k);
      if (callbacks.onZoom) callbacks.onZoom(event.transform);
    });
    svg.call(zoom).on('dblclick.zoom', null);
    updateLod(1);

    function nodeDefinitionMap(model) {
      return new Map((model ? model.personNodes : []).map(function(item) { return [item.id, item]; }));
    }

    function hubDefinitionMap(model) {
      return new Map((model ? model.hubs : []).map(function(item) { return [item.id, item]; }));
    }

    function render(layout, renderState) {
      if (destroyed || !layout) return;
      var state = renderState || {};
      var model = state.model || currentModel;
      if (!model) throw new Error('Family renderer requires renderState.model');
      currentLayout = layout;
      currentModel = model;
      var houseColors = state.houseColorByNode || new Map();
      var foldCounts = state.foldCounts || new Map();

      var edges = edgeLayer.selectAll('path.family-edge').data(layout.edges || [], function(edge) { return edge.id; });
      edges.exit().remove();
      edges = edges.enter().append('path')
        .attr('fill', 'none')
        .attr('vector-effect', 'non-scaling-stroke')
        .merge(edges)
        .attr('class', function(edge) { return relationClass(edge) + (edge.feedback ? ' feedback' : ''); })
        .attr('data-edge-id', function(edge) { return edge.id; })
        .attr('data-relation-id', function(edge) { return edge.relationId; })
        .attr('d', function(edge) { return pointsToPath(edge.points); })
        .attr('marker-end', function(edge) { return edge.kind === 'succession' ? 'url(#family-arrow)' : null; })
        .on('click.family', function(event, edge) {
          event.stopPropagation();
          if (callbacks.onSelectRelation) callbacks.onSelectRelation(edge.relationId, event);
        });
      edgeElements = new Map();
      edges.each(function(edge) { edgeElements.set(edge.id, this); });

      var hubData = (currentModel.hubs || []).filter(function(hub) { return layout.nodes[hub.id]; });
      var hubs = hubLayer.selectAll('g.family-hub').data(hubData, function(hub) { return hub.id; });
      hubs.exit().remove();
      var hubEnter = hubs.enter().append('g').attr('class', 'family-hub').attr('tabindex', 0).attr('role', 'button');
      hubEnter.append('circle').attr('class', 'family-hub-ring');
      hubEnter.append('path').attr('class', 'family-hub-glyph');
      hubEnter.append('title');
      hubs = hubEnter.merge(hubs)
        .attr('data-hub-id', function(hub) { return hub.id; })
        .attr('data-relation-id', function(hub) { return hub.relationId; })
        .attr('data-kind', function(hub) { return hub.kind; })
        .attr('transform', function(hub) {
          var point = layout.nodes[hub.id];
          return 'translate(' + (point.x + point.width / 2) + ',' + (point.y + point.height / 2) + ')';
        })
        .attr('aria-label', function(hub) { return (hub.label || hub.subtype || hub.kind) + '关系'; })
        .on('click.family', function(event, hub) {
          event.stopPropagation();
          if (callbacks.onSelectRelation) callbacks.onSelectRelation(hub.relationId, event);
        })
        .on('keydown.family', function(event, hub) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (callbacks.onSelectRelation) callbacks.onSelectRelation(hub.relationId, event);
          }
        });
      hubs.select('circle').attr('r', function(hub) { return hub.kind === 'union' ? 9 : 7; });
      hubs.select('path').attr('d', function(hub) {
        if (hub.kind === 'union') return 'M-4,0H4M0,-4V4';
        if (hub.kind === 'parentage') return 'M-4,-3L0,3L4,-3';
        return 'M-3,-3L3,3M3,-3L-3,3';
      });
      hubs.select('title').text(function(hub) { return hub.label || hub.subtype || hub.kind; });
      hubElements = new Map();
      hubs.each(function(hub) { hubElements.set(hub.id, this); });

      var personData = (currentModel.personNodes || []).filter(function(person) { return layout.nodes[person.id]; });
      var people = nodeLayer.selectAll('g.family-person').data(personData, function(person) { return person.id; });
      people.exit().remove();
      var personEnter = people.enter().append('g')
        .attr('class', 'family-person')
        .attr('tabindex', 0)
        .attr('role', 'button');
      personEnter.append('rect').attr('class', 'family-person-card').attr('width', 132).attr('height', 60).attr('rx', 6);
      personEnter.append('rect').attr('class', 'family-house-stripe').attr('width', 5).attr('height', 60).attr('rx', 2);
      personEnter.append('circle').attr('class', 'family-avatar-backdrop').attr('cx', 24).attr('cy', 25).attr('r', 15);
      personEnter.append('image').attr('class', 'family-avatar').attr('x', 9).attr('y', 10).attr('width', 30).attr('height', 30).attr('preserveAspectRatio', 'xMidYMid slice');
      personEnter.append('text').attr('class', 'family-initials').attr('x', 24).attr('y', 29).attr('text-anchor', 'middle');
      personEnter.append('text').attr('class', 'family-name family-name-line-1').attr('x', 47).attr('y', 23);
      personEnter.append('text').attr('class', 'family-name family-name-line-2').attr('x', 47).attr('y', 37);
      personEnter.append('text').attr('class', 'family-person-meta').attr('x', 47).attr('y', 52);
      personEnter.append('g').attr('class', 'family-fold-badge').append('text').attr('x', 119).attr('y', 53).attr('text-anchor', 'middle');
      personEnter.append('title');
      people = personEnter.merge(people)
        .attr('data-node-id', function(person) { return person.id; })
        .attr('transform', function(person) {
          var point = layout.nodes[person.id];
          return 'translate(' + point.x + ',' + point.y + ')';
        })
        .attr('aria-label', function(person) { return '人物：' + person.name; })
        .on('click.family', function(event, person) {
          event.stopPropagation();
          if (callbacks.onSelectNode) callbacks.onSelectNode(person.id, event);
        })
        .on('dblclick.family', function(event, person) {
          event.stopPropagation();
          if (callbacks.onFocusNode) callbacks.onFocusNode(person.id, event);
        })
        .on('keydown.family', function(event, person) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (callbacks.onSelectNode) callbacks.onSelectNode(person.id, event);
          }
        });
      people.each(function(person) {
        var group = d3.select(this);
        var node = person.node || {};
        var lines = wrapFamilyName(person.name, 13);
        var avatar = node.avatar || '';
        group.select('.family-house-stripe').attr('fill', houseColors.get(person.id) || '#d4a574');
        group.select('.family-avatar').attr('href', avatar || null).style('display', avatar ? null : 'none');
        group.select('.family-initials').text(initials(person.name)).style('display', avatar ? 'none' : null);
        group.select('.family-name-line-1').text(lines[0] || '');
        group.select('.family-name-line-2').text(lines[1] || '').style('display', lines[1] ? null : 'none');
        group.select('.family-person-meta').text(metadataLine(node));
        var foldCount = Number(foldCounts.get(person.id)) || 0;
        group.select('.family-fold-badge').style('display', foldCount ? null : 'none').select('text').text('+' + foldCount);
        group.select('title').text(person.name + (node.notes ? '\n' + node.notes : ''));
      });
      nodeElements = new Map();
      people.each(function(person) { nodeElements.set(person.id, this); });

      svg.on('click.family-clear', function(event) {
        if (event.target === svgElement || event.target.classList.contains('family-grid')) {
          if (callbacks.onClearSelection) callbacks.onClearSelection(event);
        }
      });
    }

    function setClass(map, ids, className) {
      map.forEach(function(element, id) { element.classList.toggle(className, ids.has(id)); });
    }

    function updateHighlight(highlightState) {
      var state = highlightState || {};
      var nodes = new Set(state.highlightedNodeIds || []);
      var edges = new Set(state.highlightedEdgeIds || []);
      var searches = new Set(state.searchNodeIds || []);
      if (state.selectedNodeId) nodes.add(state.selectedNodeId);
      setClass(nodeElements, nodes, 'is-highlighted');
      setClass(nodeElements, searches, 'is-search-match');
      setClass(edgeElements, edges, 'is-highlighted');
      nodeElements.forEach(function(element, id) {
        element.classList.toggle('is-selected', id === state.selectedNodeId);
      });
      hubElements.forEach(function(element) {
        element.classList.toggle('is-selected', element.dataset.relationId === state.selectedRelationId);
      });
      edgeElements.forEach(function(element) {
        element.classList.toggle('is-selected', element.dataset.relationId === state.selectedRelationId);
      });
      var hasHighlight = nodes.size > 0 || searches.size > 0 || edges.size > 0 || Boolean(state.selectedRelationId);
      rootLayer.classed('has-family-highlight', hasHighlight && state.dimOthers !== false);
    }

    function fitView(options) {
      if (!currentLayout) return;
      var settings = options || {};
      var bounds = currentLayout.bounds || { x: 0, y: 0, width: currentLayout.width, height: currentLayout.height };
      if (!bounds.width || !bounds.height) return;
      var rect = svgElement.getBoundingClientRect();
      var width = rect.width || svgElement.clientWidth || 1;
      var height = rect.height || svgElement.clientHeight || 1;
      var padding = Number(settings.padding) || 48;
      var scale = Math.min(2, Math.max(0.02, Math.min((width - padding * 2) / bounds.width, (height - padding * 2) / bounds.height)));
      var translateX = width / 2 - scale * (bounds.x + bounds.width / 2);
      var translateY = height / 2 - scale * (bounds.y + bounds.height / 2);
      var transform = d3.zoomIdentity.translate(translateX, translateY).scale(scale);
      var target = settings.animate === false ? svg : svg.transition().duration(320);
      target.call(zoom.transform, transform);
    }

    function zoomBy(factor) {
      svg.transition().duration(180).call(zoom.scaleBy, Number(factor) || 1);
    }

    function centerOnNode(nodeId, options) {
      var point = currentLayout && currentLayout.nodes && currentLayout.nodes[String(nodeId)];
      if (!point) return false;
      var settings = options || {};
      var rect = svgElement.getBoundingClientRect();
      var width = rect.width || svgElement.clientWidth || 1;
      var height = rect.height || svgElement.clientHeight || 1;
      var current = d3.zoomTransform(svgElement);
      var scale = Math.min(4, Math.max(current.k, Number(settings.scale) || 0.9));
      var centerX = point.x + point.width / 2;
      var centerY = point.y + point.height / 2;
      var transform = d3.zoomIdentity.translate(width / 2 - centerX * scale, height / 2 - centerY * scale).scale(scale);
      var target = settings.animate === false ? svg : svg.transition().duration(240);
      target.call(zoom.transform, transform);
      return true;
    }

    return {
      render: render,
      updateHighlight: updateHighlight,
      updateLod: updateLod,
      fitView: fitView,
      zoomBy: zoomBy,
      centerOnNode: centerOnNode,
      getTransform: function() { return d3.zoomTransform(svgElement); },
      destroy: function() {
        destroyed = true;
        svg.on('.zoom', null).on('.family-clear', null);
        svg.selectAll('*').remove();
        nodeElements.clear();
        edgeElements.clear();
        hubElements.clear();
      },
    };
  }

  return {
    relationClass: relationClass,
    nodeLod: nodeLod,
    wrapFamilyName: wrapFamilyName,
    pointsToPath: pointsToPath,
    createFamilyRenderer: createFamilyRenderer,
  };
});
