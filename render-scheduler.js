(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DramatisRenderScheduler = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function createRenderScheduler(options) {
    var opts = options || {};
    var requestFrame = opts.requestFrame || (typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame.bind(globalThis)
      : function(fn) { return setTimeout(function() { fn(Date.now()); }, 16); });
    var framePending = false;
    var flushing = false;
    var pendingLayout = null;

    function schedule() {
      if (framePending || !pendingLayout) return;
      framePending = true;
      requestFrame(function(now) {
        var callback = pendingLayout;
        pendingLayout = null;
        framePending = false;
        flushing = true;
        try {
          if (callback) callback(now);
        } finally {
          flushing = false;
        }
        if (pendingLayout) schedule();
      });
    }

    function requestLayout(callback) {
      if (typeof callback === 'function') pendingLayout = callback;
      if (flushing) return;
      schedule();
    }

    function hasPendingLayout() {
      return !!pendingLayout || framePending;
    }

    return {
      hasPendingLayout: hasPendingLayout,
      requestLayout: requestLayout,
    };
  }

  return {
    createRenderScheduler: createRenderScheduler,
  };
});

