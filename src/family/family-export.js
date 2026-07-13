(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DramatisFamilyExport = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  function escapeXml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[character];
    });
  }

  function finiteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function validBox(box) {
    return box && finiteNumber(box.x) && finiteNumber(box.y)
      && finiteNumber(box.width) && finiteNumber(box.height);
  }

  function exportGeometry(layout, padding) {
    var fallback = { x: 0, y: 0, width: 1, height: 1 };
    var bounds = validBox(layout && layout.bounds) ? layout.bounds : fallback;
    var pad = Math.max(0, Number(padding) || 24);
    return {
      x: bounds.x - pad,
      y: bounds.y - pad,
      width: Math.max(1, bounds.width + pad * 2),
      height: Math.max(1, bounds.height + pad * 2),
    };
  }

  function pointsToPath(points) {
    if (!Array.isArray(points) || points.length < 2 || points.some(function(point) {
      return !point || !finiteNumber(point.x) || !finiteNumber(point.y);
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

  function ellipsize(text, maximum) {
    var characters = Array.from(String(text || ''));
    return characters.length <= maximum ? characters.join('') : characters.slice(0, maximum - 1).join('') + '…';
  }

  function nameLines(name) {
    var text = String(name || '?').trim().replace(/\s+/g, ' ');
    if (Array.from(text).length <= 13) return [text];
    var words = text.split(' ');
    if (words.length === 1) return [ellipsize(text, 13)];
    var midpoint = Math.ceil(words.length / 2);
    return [ellipsize(words.slice(0, midpoint).join(' '), 13), ellipsize(words.slice(midpoint).join(' '), 13)];
  }

  function metaLine(person) {
    var node = person && person.node || {};
    if (node.generationLabel) return String(node.generationLabel);
    if (Array.isArray(node.titles) && node.titles.length) return String(node.titles[0]);
    if (Array.isArray(node.aliases) && node.aliases.length) return String(node.aliases[0]);
    return '';
  }

  function buildFamilySvg(options) {
    var opts = options || {};
    var layout = opts.layout || {};
    var model = opts.model || {};
    var geometry = exportGeometry(layout, opts.padding);
    var nodePositions = layout.nodes || {};
    var parts = [];
    parts.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + geometry.width + '" height="' + geometry.height
      + '" viewBox="' + geometry.x + ' ' + geometry.y + ' ' + geometry.width + ' ' + geometry.height + '" role="img">');
    parts.push('<title>' + escapeXml(opts.title || 'Dramatis 家系图') + '</title>');
    parts.push('<defs><marker id="family-export-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#8fa8a2"/></marker></defs>');
    parts.push('<style>svg{background:#0d0f13}.edge{fill:none;stroke:#707785;stroke-width:1.4}.edge.union{stroke:#d4a574}.edge.parentage{stroke:#83aaa3}.edge.kinship{stroke:#8e87b8;stroke-dasharray:5 4}.edge.succession{stroke:#c77870}.edge.rumored,.edge.disputed{stroke-dasharray:4 4}.card{fill:#191c23;stroke:#3a404b}.stripe{fill:#d4a574}.avatar{fill:#252a34;stroke:#444b58}.initials{fill:#a4a9b3;font:600 10px serif}.name{fill:#eee9dc;font:600 10px serif}.meta{fill:#8e94a1;font:8px serif}.hub{fill:#171a20;stroke:#d4a574;stroke-width:1.5}.hub-glyph{fill:none;stroke:#d4a574;stroke-width:1.2}</style>');
    parts.push('<g class="family-export-root">');

    (layout.edges || []).forEach(function(edge) {
      var path = pointsToPath(edge.points);
      if (!path) return;
      var classes = ['edge', edge.kind || 'other', edge.certainty || 'unknown'].join(' ');
      var marker = edge.kind === 'succession' ? ' marker-end="url(#family-export-arrow)"' : '';
      parts.push('<path class="' + escapeXml(classes) + '" data-relation-id="' + escapeXml(edge.relationId || '') + '" d="' + path + '"' + marker + '/>');
    });

    (model.hubs || []).forEach(function(hub) {
      var box = nodePositions[hub.id];
      if (!validBox(box)) return;
      var centerX = box.x + box.width / 2;
      var centerY = box.y + box.height / 2;
      var radius = hub.kind === 'union' ? 9 : 7;
      var glyph = hub.kind === 'union' ? 'M-4,0H4M0,-4V4' : (hub.kind === 'parentage' ? 'M-4,-3L0,3L4,-3' : 'M-3,-3L3,3M3,-3L-3,3');
      parts.push('<g data-relation-id="' + escapeXml(hub.relationId || '') + '" transform="translate(' + centerX + ' ' + centerY + ')"><circle class="hub" r="' + radius + '"/><path class="hub-glyph" d="' + glyph + '"/></g>');
    });

    (model.personNodes || []).forEach(function(person) {
      var box = nodePositions[person.id];
      if (!validBox(box)) return;
      var lines = nameLines(person.name);
      parts.push('<g data-node-id="' + escapeXml(person.id) + '" transform="translate(' + box.x + ' ' + box.y + ')">');
      parts.push('<rect class="card" width="132" height="60" rx="6"/><rect class="stripe" width="5" height="60" rx="2"/><circle class="avatar" cx="24" cy="25" r="15"/>');
      parts.push('<text class="initials" x="24" y="29" text-anchor="middle">' + escapeXml(initials(person.name)) + '</text>');
      parts.push('<text class="name" x="47" y="23">' + escapeXml(lines[0] || '') + '</text>');
      if (lines[1]) parts.push('<text class="name" x="47" y="37">' + escapeXml(lines[1]) + '</text>');
      parts.push('<text class="meta" x="47" y="52">' + escapeXml(metaLine(person)) + '</text>');
      parts.push('</g>');
    });

    parts.push('</g></svg>');
    return parts.join('');
  }

  function triggerDownload(doc, blob, filename) {
    var url = URL.createObjectURL(blob);
    var anchor = doc.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(function() { URL.revokeObjectURL(url); }, 0);
  }

  function downloadFamilySvg(options) {
    var opts = options || {};
    var doc = opts.document || document;
    var svg = buildFamilySvg(opts);
    triggerDownload(doc, new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), opts.filename || 'Dramatis-家系图.svg');
  }

  function downloadFamilyPng(options) {
    var opts = options || {};
    var doc = opts.document || document;
    var svg = buildFamilySvg(opts);
    var geometry = exportGeometry(opts.layout, opts.padding);
    var scale = Math.min(Number(opts.scale) || 2, 8192 / geometry.width, 8192 / geometry.height);
    var svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    return new Promise(function(resolve, reject) {
      var image = new Image();
      image.onload = function() {
        try {
          var canvas = doc.createElement('canvas');
          canvas.width = Math.max(1, Math.round(geometry.width * scale));
          canvas.height = Math.max(1, Math.round(geometry.height * scale));
          var context = canvas.getContext('2d');
          context.scale(scale, scale);
          context.drawImage(image, 0, 0, geometry.width, geometry.height);
          canvas.toBlob(function(blob) {
            URL.revokeObjectURL(svgUrl);
            if (!blob) return reject(new Error('PNG 编码失败'));
            triggerDownload(doc, blob, opts.filename || 'Dramatis-家系图.png');
            resolve(blob);
          }, 'image/png');
        } catch (error) {
          URL.revokeObjectURL(svgUrl);
          reject(error);
        }
      };
      image.onerror = function() { URL.revokeObjectURL(svgUrl); reject(new Error('SVG 图像载入失败')); };
      image.src = svgUrl;
    });
  }

  return {
    escapeXml: escapeXml,
    exportGeometry: exportGeometry,
    pointsToPath: pointsToPath,
    buildFamilySvg: buildFamilySvg,
    downloadFamilySvg: downloadFamilySvg,
    downloadFamilyPng: downloadFamilyPng,
  };
});
