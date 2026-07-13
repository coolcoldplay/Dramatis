(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DramatisSearchHighlight = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function isEditableTarget(target) {
    if (!target) return false;
    var tagName = String(target.tagName || '').toUpperCase();
    return target.isContentEditable || tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
  }

  function normalizeSearchQuery(value) {
    return String(value == null ? '' : value).trim().toLowerCase();
  }

  function collectTagNames(node, tagCategories) {
    var names = [];
    var tagsByCategory = (node && node.tags) || {};
    (tagCategories || []).forEach(function(category) {
      if (!category || category.visible === false) return;
      var tagId = tagsByCategory[category.id];
      if (!tagId) return;
      var tag = (category.tags || []).find(function(item) { return item && item.id === tagId; });
      if (tag && tag.name) names.push(tag.name);
    });
    return names;
  }

  function nodeNameSearchText(node) {
    if (!node) return '';
    return [node.name || ''].concat(Array.isArray(node.aliases) ? node.aliases : []).join(' ').toLowerCase();
  }

  function nodeNameSearchTerms(node) {
    if (!node) return [];
    return [node.name || ''].concat(Array.isArray(node.aliases) ? node.aliases : [])
      .map(normalizeSearchQuery)
      .filter(Boolean);
  }

  function nodeSearchText(node, tagCategories) {
    if (!node) return '';
    return [
      node.name || '',
      (Array.isArray(node.aliases) ? node.aliases : []).join(' '),
      (Array.isArray(node.titles) ? node.titles : []).join(' '),
      node.notes || '',
      node.gender || '',
      collectTagNames(node, tagCategories).join(' '),
    ].join(' ').toLowerCase();
  }

  function findMatchingNodeIds(nodes, query, tagCategories, options) {
    var q = normalizeSearchQuery(query);
    var opts = options || {};
    var fuzzy = opts.fuzzy === true;
    if (!q) return [];
    var visibleNodes = (nodes || []).filter(function(node) { return node && !node.hidden; });
    var matches;
    if (fuzzy) {
      matches = visibleNodes.filter(function(node) {
        return nodeSearchText(node, tagCategories).indexOf(q) !== -1;
      });
    } else {
      var exactMatches = visibleNodes.filter(function(node) {
        return nodeNameSearchTerms(node).indexOf(q) !== -1;
      });
      matches = exactMatches.length ? exactMatches : visibleNodes.filter(function(node) {
        return nodeNameSearchText(node).indexOf(q) !== -1;
      });
    }
    return matches
      .map(function(node) { return node.id; })
      .filter(Boolean);
  }

  function isSearchFocusShortcut(event) {
    if (!event) return false;
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return false;
    if (isEditableTarget(event.target)) return false;
    return String(event.key || '') === '/';
  }

  function isHelpShortcut(event) {
    if (!event) return false;
    if (event.ctrlKey || event.metaKey || event.altKey) return false;
    if (isEditableTarget(event.target)) return false;
    var key = String(event.key || '');
    return key === '?' || (key === '/' && event.shiftKey);
  }

  return {
    findMatchingNodeIds: findMatchingNodeIds,
    isHelpShortcut: isHelpShortcut,
    isSearchFocusShortcut: isSearchFocusShortcut,
    normalizeSearchQuery: normalizeSearchQuery,
    nodeNameSearchTerms: nodeNameSearchTerms,
    nodeNameSearchText: nodeNameSearchText,
    nodeSearchText: nodeSearchText,
  };
});
