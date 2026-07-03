(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DramatisNodeLabelLayout = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function normalizeNodeLabelPlacement(value) {
    return value === 'inside' ? 'inside' : 'outside';
  }

  function estimateMaxCharsPerLine(radius, fontSize) {
    var r = Number(radius);
    var fs = Number(fontSize);
    if (!Number.isFinite(r) || r <= 0) r = 28;
    if (!Number.isFinite(fs) || fs <= 0) fs = 13;

    var maxWidth = Math.max(4, r * 1.55);
    var avgCharWidth = Math.max(4, fs * 0.58);
    return Math.max(1, Math.floor(maxWidth / avgCharWidth));
  }

  function ellipsize(value, maxChars, force) {
    var text = String(value || '');
    var limit = Math.max(1, Math.floor(Number(maxChars) || 1));
    if (!force && text.length <= limit) return text;
    if (limit <= 3) return '.'.repeat(limit);
    return text.slice(0, limit - 3) + '...';
  }

  function splitLongToken(token, maxChars) {
    var chunks = [];
    var text = String(token || '');
    var limit = Math.max(1, maxChars);
    for (var i = 0; i < text.length; i += limit) {
      chunks.push(text.slice(i, i + limit));
    }
    return chunks;
  }

  function wrapNodeLabel(label, options) {
    var opts = options || {};
    var maxChars = Math.max(1, Math.floor(Number(opts.maxCharsPerLine) || 4));
    var maxLines = Math.max(1, Math.floor(Number(opts.maxLines) || 3));
    var text = String(label || '').replace(/\s+/g, ' ').trim();
    if (!text) return ['?'];

    var tokens = text.split(' ');
    var lines = [];
    var current = '';

    tokens.forEach(function(token) {
      if (!token) return;

      if (token.length > maxChars) {
        if (current) {
          lines.push(current);
          current = '';
        }
        splitLongToken(token, maxChars).forEach(function(chunk) {
          lines.push(chunk);
        });
        return;
      }

      if (!current) {
        current = token;
        return;
      }

      if ((current + ' ' + token).length <= maxChars) {
        current += ' ' + token;
      } else {
        lines.push(current);
        current = token;
      }
    });

    if (current) lines.push(current);
    if (!lines.length) lines.push('?');

    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      lines[maxLines - 1] = ellipsize(lines[maxLines - 1], maxChars, true);
    }

    return lines;
  }

  return {
    estimateMaxCharsPerLine: estimateMaxCharsPerLine,
    normalizeNodeLabelPlacement: normalizeNodeLabelPlacement,
    wrapNodeLabel: wrapNodeLabel,
  };
});
