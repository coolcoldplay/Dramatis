(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DramatisRenderMode = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  var MODES = {
    small: {
      name: 'small',
      className: 'render-mode-small',
      showLinkLabels: true,
      showNodeLabels: true,
      simplifyNodes: false,
      simplifyCurves: false,
      showAvatars: true,
      linkTickModulo: 1,
    },
    medium: {
      name: 'medium',
      className: 'render-mode-medium',
      showLinkLabels: false,
      showNodeLabels: true,
      simplifyNodes: false,
      simplifyCurves: false,
      showAvatars: true,
      linkTickModulo: 1,
    },
    large: {
      name: 'large',
      className: 'render-mode-large',
      showLinkLabels: false,
      showNodeLabels: false,
      simplifyNodes: true,
      simplifyCurves: true,
      showAvatars: false,
      linkTickModulo: 2,
    },
    huge: {
      name: 'huge',
      className: 'render-mode-huge',
      showLinkLabels: false,
      showNodeLabels: false,
      simplifyNodes: true,
      simplifyCurves: true,
      showAvatars: false,
      linkTickModulo: 3,
    },
  };

  function cloneMode(mode) {
    var copy = {};
    Object.keys(mode).forEach(function(key) {
      copy[key] = mode[key];
    });
    return copy;
  }

  function baseModeName(nodeCount, linkCount) {
    var nodes = Math.max(0, Number(nodeCount) || 0);
    var links = Math.max(0, Number(linkCount) || 0);
    if (nodes > 3000 || links > 20000) return 'huge';
    if (nodes > 1000 || links > 5000) return 'large';
    if (nodes > 350 || links > 1200) return 'medium';
    return 'small';
  }

  function resolveRenderMode(options) {
    var opts = options || {};
    var name = baseModeName(opts.nodeCount, opts.linkCount);
    var quality = opts.quality || 'balanced';
    if (quality === 'high' && name === 'huge') name = 'large';
    else if (quality === 'high' && name === 'large') name = 'medium';
    else if (quality === 'high' && name === 'medium') name = 'small';
    if (quality === 'performance' && name === 'medium') name = 'large';
    if (quality === 'performance' && name === 'small') name = 'medium';

    var mode = cloneMode(MODES[name] || MODES.small);
    if (quality === 'high') {
      mode.showLinkLabels = true;
      mode.showNodeLabels = true;
      mode.simplifyNodes = false;
      mode.simplifyCurves = false;
      mode.showAvatars = true;
      mode.linkTickModulo = 1;
    }
    return mode;
  }

  function shouldShowLinkLabels(mode) {
    return !!(mode && mode.showLinkLabels);
  }

  function shouldUseSimplifiedNodes(mode) {
    return !!(mode && mode.simplifyNodes);
  }

  return {
    resolveRenderMode: resolveRenderMode,
    shouldShowLinkLabels: shouldShowLinkLabels,
    shouldUseSimplifiedNodes: shouldUseSimplifiedNodes,
  };
});
