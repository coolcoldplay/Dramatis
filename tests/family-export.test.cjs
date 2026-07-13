const assert = require('node:assert/strict');
const test = require('node:test');

const FamilyExport = require('../src/family/family-export.js');

const model = {
  personNodes: [
    { id: 'N1', name: '乌苏拉·伊瓜兰', node: { titles: ['女族长'] } },
    { id: 'N2', name: 'José Arcadio', node: {} },
  ],
  hubs: [{ id: 'U:F1', relationId: 'F1', kind: 'union', subtype: 'marriage', label: '婚姻' }],
};

const layout = {
  bounds: { x: 10, y: 20, width: 420, height: 210 },
  nodes: {
    N1: { x: 20, y: 40, width: 132, height: 60 },
    N2: { x: 290, y: 40, width: 132, height: 60 },
    'U:F1': { x: 214, y: 62, width: 18, height: 18 },
  },
  edges: [{
    id: 'F1:0', relationId: 'F1', kind: 'union', subtype: 'marriage', certainty: 'confirmed',
    points: [{ x: 152, y: 70 }, { x: 214, y: 70 }],
  }],
};

test('builds a standalone, fitted family SVG', () => {
  const svg = FamilyExport.buildFamilySvg({ layout, model, title: '百年孤独家系图' });

  assert.match(svg, /^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg, /viewBox="-14 -4 468 258"/);
  assert.match(svg, /乌苏拉·伊瓜兰/);
  assert.match(svg, /José Arcadio/);
  assert.match(svg, /data-relation-id="F1"/);
  assert.equal(/transform="translate\([^)]*\) scale\(/.test(svg), false);
});

test('escapes untrusted labels and ignores invalid paths', () => {
  const svg = FamilyExport.buildFamilySvg({
    layout: { bounds: layout.bounds, nodes: layout.nodes, edges: [{ id: 'bad', points: [{ x: NaN, y: 2 }] }] },
    model: { personNodes: [{ id: 'N1', name: '<script>alert(1)</script>', node: {} }], hubs: [] },
  });

  assert.match(svg, /&lt;script&gt;aler/);
  assert.equal(svg.includes('<script>alert(1)</script>'), false);
  assert.equal(svg.includes('NaN'), false);
});
