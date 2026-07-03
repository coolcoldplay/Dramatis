(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.DramatisAppState = factory(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function(root) {
  function createInitialState() {
    return {
      nodes: [],
      links: [],
      tagCategories: [],
      linkMode: false,
      linkFrom: null,
      nextId: 1,
      editing: null,
      selectedNodes: new Set(),
      currentEpisode: null,
      episodeList: [],
      episodeSequence: 0,
      mode: 'organize',
      freePlacement: false,
      graphBackgroundColor: '#0d0e12',
      graphStyle: {
        nodeLabelColor: '#e8e4d6',
        nodeLabelFontSize: 13,
        nodeScale: 1.0,
        nodeLabelOpacity: 1.0,
        nodeLabelPlacement: 'outside',
      },
      linkTypes: {
        relation: {
          label: '\u5173\u7cfb',
          color: '#4a5068',
          width: 1.5,
          dasharray: '',
          labelColor: '#8a8e9f',
          directed: false,
          labelFontSize: 11,
          labelOrientation: 'horizontal',
        },
        action: {
          label: '\u884c\u52a8',
          color: '#4a5068',
          width: 1.5,
          dasharray: '',
          labelColor: '#8a8e9f',
          directed: true,
          labelFontSize: 11,
          labelOrientation: 'horizontal',
        },
      },
      characterSort: {
        by: 'creation',
        order: 'asc',
      },
      graphIndex: null,
      _pendingLinkFrom: null,
      forceConfig: {
        centerStrength: 0.05,
        chargeStrength: -650,
        linkStrength: 0.5,
        linkDistance: 170,
      },
    };
  }

  function normalizeNodeLabelPlacement(value) {
    if (root.DramatisNodeLabelLayout && root.DramatisNodeLabelLayout.normalizeNodeLabelPlacement) {
      return root.DramatisNodeLabelLayout.normalizeNodeLabelPlacement(value);
    }
    return value === 'inside' ? 'inside' : 'outside';
  }

  function normalizeGraphStyle(style) {
    var gs = Object.assign({}, style || {});
    if (!gs.nodeLabelColor) gs.nodeLabelColor = '#e8e4d6';
    if (gs.nodeLabelFontSize == null) gs.nodeLabelFontSize = 13;
    if (gs.nodeScale == null) gs.nodeScale = 1.0;
    if (gs.nodeLabelOpacity == null) gs.nodeLabelOpacity = 1.0;
    gs.nodeLabelPlacement = normalizeNodeLabelPlacement(gs.nodeLabelPlacement);
    return gs;
  }

  return {
    createInitialState: createInitialState,
    normalizeGraphStyle: normalizeGraphStyle,
    normalizeNodeLabelPlacement: normalizeNodeLabelPlacement,
  };
});
