const assert = require('node:assert/strict');
const test = require('node:test');

const { normalizeImportedGraph } = require('../src/import-export.js');
const graphIndex = require('../graph-index.js');
const { normalizeGraphStyle } = require('../src/app-state.js');

const defaultLinkTypes = {
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
};

test('normalizes imported graph data and resolves link endpoints', () => {
  const result = normalizeImportedGraph({
    nextId: 3,
    clusterSpacing: 1.75,
    topologySizing: { mode: 'degree', strength: 0.8 },
    graphStyle: { nodeLabelPlacement: 'inside' },
    graphBackground: { value: '#101010' },
    linkTypes: {
      relation: { color: '#111111' },
    },
    nodes: [
      { id: 'N1', name: 'A' },
      { id: 'N2', name: 'B', fx: 12, fy: 20 },
    ],
    links: [
      { id: 'L4', source: 'N1', target: 'N2', directed: false },
      { id: 'L404', source: 'N1', target: 'N404' },
    ],
    tagCategories: [
      { id: 'C5', name: 'Type', tags: [{ id: 'T9', name: 'Person' }] },
    ],
  }, {
    defaultLinkTypes,
    graphIndex,
    normalizeGraphStyle,
  });

  assert.equal(result.nodes.length, 2);
  assert.equal(result.nodes[0].notes, '');
  assert.deepEqual(result.nodes[0].tags, {});
  assert.equal(result.nodes[1].fx, 12);
  assert.equal(result.links.length, 1);
  assert.equal(result.links[0].source, result.nodes[0]);
  assert.equal(result.links[0].target, result.nodes[1]);
  assert.equal(result.links[0].type, 'relation');
  assert.equal(result.tagCategories[0].visible, true);
  assert.equal(result.linkTypes.relation.color, '#111111');
  assert.equal(result.linkTypes.action.label, '\u884c\u52a8');
  assert.equal(result.graphStyle.nodeLabelPlacement, 'inside');
  assert.equal(result.graphBackgroundColor, '#101010');
  assert.equal(result.clusterSpacing, 1.75);
  assert.deepEqual(result.topologySizing, { mode: 'degree', strength: 0.8 });
  assert.equal(result.nextId, 10);
  assert.equal(result.droppedLinks.length, 1);
});

test('normalizes missing cluster spacing to the default', () => {
  const result = normalizeImportedGraph({}, {
    defaultLinkTypes,
    graphIndex,
    normalizeGraphStyle,
  });

  assert.equal(result.clusterSpacing, 1);
  assert.deepEqual(result.topologySizing, { mode: 'none', strength: 0.65 });
});
