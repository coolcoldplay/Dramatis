function renderFamilyTree() {
  var data = buildFamilyData();
  if (!data) { alert('没有家系关系数据。\n请先在连线编辑中设置「家系关系类型」。'); return; }
  var fmap = data.fmap;
  var lay = layoutFamilyTree(fmap);
  var X = lay.X, Y = lay.Y, NODE_W = lay.NODE_W, NODE_H = lay.NODE_H;

  ftG.selectAll('*').remove();

  var xs = Object.values(X), ys = Object.values(Y);
  var minX = Math.min.apply(null, xs) - NODE_W / 2 - 40;
  var maxX = Math.max.apply(null, xs) + NODE_W / 2 + 40;
  var minY = Math.min.apply(null, ys) - NODE_H / 2 - 60;
  var maxY = Math.max.apply(null, ys) + NODE_H / 2 + 60;
  ftSvg.attr('viewBox', minX + ' ' + minY + ' ' + (maxX - minX) + ' ' + (maxY - minY));

  var linkLayer = ftG.append('g').attr('class', 'ft-links');

  /* ---- 婚姻线 ---- */
  lay.allUnits.forEach(function(u) {
    if (u.ids.length !== 2) return;
    var aId = u.ids[0], bId = u.ids[1];
    var ax = X[aId], bx = X[bId];
    var lx = Math.min(ax, bx) + NODE_W / 2;
    var rx = Math.max(ax, bx) - NODE_W / 2;
    var my = Y[aId];
    var isInf = fmap[aId].node.isPlaceholder || fmap[bId].node.isPlaceholder;
    linkLayer.append('line')
      .attr('x1', lx).attr('y1', my).attr('x2', rx).attr('y2', my)
      .attr('stroke', isInf ? '#404560' : '#d4a574')
      .attr('stroke-width', isInf ? 1.5 : 2.5)
      .attr('stroke-dasharray', isInf ? '6,4' : null);
  });

  /* ---- 父-子直角连线 ---- */
  function childAttachX(parentUnit, childUnit) {
    if (childUnit.ids.length === 1) return X[childUnit.ids[0]];
    for (var i = 0; i < childUnit.ids.length; i++) {
      var cid = childUnit.ids[i];
      var cParents = Array.from(fmap[cid].adj.parents);
      if (cParents.some(function(p) { return parentUnit.ids.indexOf(p) >= 0; })) return X[cid];
    }
    return childUnit.centerX;
  }

  lay.allUnits.forEach(function(u) {
    if (u.childUnits.length === 0) return;
    var parentBottomX = u.centerX;
    var parentBottomY = u.ids.length === 2 ? Y[u.ids[0]] : (Y[u.ids[0]] + NODE_H / 2);
    var childTopY = Y[u.childUnits[0].ids[0]] - NODE_H / 2;
    var busY = parentBottomY + (childTopY - parentBottomY) * 0.5;
    var allInf = u.ids.every(function(id) { return fmap[id].node.isPlaceholder; });

    var attaches = u.childUnits.map(function(cu) {
      var ax = childAttachX(u, cu);
      var cInf = cu.ids.every(function(id) { return fmap[id].node.isPlaceholder; });
      return { ax: ax, cInf: cInf };
    });

    // 竖线：parentBottom -> busY
    linkLayer.append('line')
      .attr('x1', parentBottomX).attr('y1', parentBottomY)
      .attr('x2', parentBottomX).attr('y2', busY)
      .attr('stroke', allInf ? '#404560' : '#d4a574')
      .attr('stroke-width', allInf ? 1.2 : 2)
      .attr('stroke-dasharray', allInf ? '6,4' : null);

    // 横杆
    if (attaches.length === 1) {
      if (Math.abs(attaches[0].ax - parentBottomX) > 0.5) {
        linkLayer.append('line')
          .attr('x1', Math.min(attaches[0].ax, parentBottomX)).attr('y1', busY)
          .attr('x2', Math.max(attaches[0].ax, parentBottomX)).attr('y2', busY)
          .attr('stroke', '#d4a574').attr('stroke-width', 2);
      }
    } else if (attaches.length > 1) {
      var allXs = [parentBottomX].concat(attaches.map(function(c) { return c.ax; }));
      linkLayer.append('line')
        .attr('x1', Math.min.apply(null, allXs)).attr('y1', busY)
        .attr('x2', Math.max.apply(null, allXs)).attr('y2', busY)
        .attr('stroke', '#d4a574').attr('stroke-width', 2);
    }

    // 每个子的下落竖线
    attaches.forEach(function(c) {
      linkLayer.append('line')
        .attr('x1', c.ax).attr('y1', busY)
        .attr('x2', c.ax).attr('y2', childTopY)
        .attr('stroke', c.cInf ? '#404560' : '#d4a574')
        .attr('stroke-width', c.cInf ? 1.2 : 2)
        .attr('stroke-dasharray', c.cInf ? '6,4' : null);
    });
  });

  /* ---- 兄弟连线（同级虚线） ---- */
  var siblingDrawn = {};
  Object.keys(fmap).forEach(function(id) {
    fmap[id].adj.siblings.forEach(function(sibId) {
      var key = [id, sibId].sort().join('|');
      if (siblingDrawn[key] || !X[id] || !X[sibId]) return;
      siblingDrawn[key] = true;
      var x1, x2;
      if (X[id] < X[sibId]) { x1 = X[id] + NODE_W / 2; x2 = X[sibId] - NODE_W / 2; }
      else { x1 = X[sibId] + NODE_W / 2; x2 = X[id] - NODE_W / 2; }
      linkLayer.append('line')
        .attr('x1', x1).attr('y1', Y[id])
        .attr('x2', x2).attr('y2', Y[sibId])
        .attr('stroke', '#5a5e6f').attr('stroke-width', 1.2).attr('stroke-dasharray', '6,4');
    });
  });

  /* ---- 绘制节点 ---- */
  var nodeData = Object.keys(X).map(function(id) {
    return { id: id, x: X[id], y: Y[id], node: fmap[id].node };
  });
  var nodes = ftG.selectAll('g.ft-node').data(nodeData, function(d) { return d.id; });
  var nodeEnter = nodes.enter().append('g').attr('class', 'ft-node')
    .attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ')'; });

  nodeEnter.each(function(d) {
    var g = d3.select(this);
    var n = d.node;
    var isPh = n.isPlaceholder;
    var gender = n.gender || '';

    var fillBg = isPh ? '#1a1c24' : (gender === 'male' ? '#16253a' : (gender === 'female' ? '#2a162a' : '#1f2230'));
    var strokeClr = isPh ? '#404560' : (gender === 'male' ? '#4a90b8' : (gender === 'female' ? '#c48fb8' : '#5a5e6f'));
    var dash = isPh ? '6,4' : null;

    if (gender === 'female') {
      g.append('ellipse')
        .attr('rx', NODE_W / 2).attr('ry', NODE_H / 2)
        .attr('fill', fillBg).attr('stroke', strokeClr).attr('stroke-width', 2).attr('stroke-dasharray', dash);
    } else if (gender === 'male') {
      g.append('rect')
        .attr('x', -NODE_W / 2).attr('y', -NODE_H / 2).attr('width', NODE_W).attr('height', NODE_H)
        .attr('fill', fillBg).attr('stroke', strokeClr).attr('stroke-width', 2).attr('stroke-dasharray', dash);
    } else {
      g.append('polygon')
        .attr('points', '0,' + (-NODE_H / 2) + ' ' + (NODE_W / 2) + ',0 0,' + (NODE_H / 2) + ' ' + (-NODE_W / 2) + ',0')
        .attr('fill', fillBg).attr('stroke', strokeClr).attr('stroke-width', 2).attr('stroke-dasharray', dash);
    }

    var rawLabel = n.name || n.id || '';
    var label = rawLabel.replace(/^_ph_[fm]_/, '').replace(/_/g, '');
    if (!label || label === '?') label = '?';
    if (label.length > 5) label = label.substring(0, 4) + '…';
    g.append('text').attr('y', NODE_H / 2 + 16).attr('text-anchor', 'middle')
      .attr('fill', isPh ? '#5a5e6f' : '#e8e4d6').attr('font-size', '11px')
      .attr('font-family', "'Noto Serif SC', serif").text(label);
  });

  nodes.exit().remove();
}
