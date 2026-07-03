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

  function nodeSearchText(node, tagCategories) {
    if (!node) return '';
    return [
      node.name || '',
      node.notes || '',
      node.gender || '',
      collectTagNames(node, tagCategories).join(' '),
    ].join(' ').toLowerCase();
  }

  function findMatchingNodeIds(nodes, query, tagCategories) {
    var q = normalizeSearchQuery(query);
    if (!q) return [];
    return (nodes || [])
      .filter(function(node) {
        return node && !node.hidden && nodeSearchText(node, tagCategories).indexOf(q) !== -1;
      })
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
    nodeSearchText: nodeSearchText,
  };
});
