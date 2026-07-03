(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DramatisToolbarVisibility = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function isEditableTarget(target) {
    if (!target) return false;
    var tagName = String(target.tagName || '').toUpperCase();
    return target.isContentEditable || tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
  }

  function isToolbarToggleShortcut(event) {
    if (!event) return false;
    if (event.ctrlKey || event.metaKey || event.altKey) return false;
    if (isEditableTarget(event.target)) return false;
    return String(event.key || '').toLowerCase() === 't';
  }

  function nextToolbarHidden(currentHidden) {
    return !currentHidden;
  }

  return {
    isToolbarToggleShortcut: isToolbarToggleShortcut,
    nextToolbarHidden: nextToolbarHidden,
  };
});
