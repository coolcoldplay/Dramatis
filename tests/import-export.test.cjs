const assert = require('node:assert/strict');
const test = require('node:test');

const { normalizeImportedGraph, buildExportGraph, buildLegacyExportGraph } = require('../src/import-export.js');
const graphIndex = require('../graph-index.js');
const { normalizeGraphStyle } = require('../src/app-state.js');
const familySchema = require('../src/family/family-schema.js');

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
    title: 'Season graph',
    description: 'Episode precise',
    sources: [{ id: 'source', label: 'Guide', url: 'https://example.com', usage: 'Audit' }],
    coveragePolicy: { included: 'Named characters' },
    episodeGuide: [{ season: 2, episode: 1, title: 'Episode one', eventNodeIds: ['N1'] }],
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
    familySchema,
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
  assert.equal(result.datasetMeta.title, 'Season graph');
  assert.equal(result.datasetMeta.episodeGuide[0].raw, 'S2E1');
  assert.deepEqual(result.datasetMeta.episodeGuide[0].eventNodeIds, ['N1']);
  assert.equal(result.nextId, 10);
  assert.equal(result.droppedLinks.length, 1);
  assert.deepEqual(result.familyRelations, []);
  assert.equal(result.familyView.layoutMode, 'lineage');
});

test('normalizes missing cluster spacing to the default', () => {
  const result = normalizeImportedGraph({}, {
    defaultLinkTypes,
    graphIndex,
    normalizeGraphStyle,
    familySchema,
  });

  assert.equal(result.clusterSpacing, 1);
  assert.deepEqual(result.topologySizing, { mode: 'none', strength: 0.65 });
});

test('imports v5 family relations and migrates v4 links', () => {
  const v5 = normalizeImportedGraph({
    familyRelations: [{
      id: 'F1', kind: 'union', subtype: 'marriage',
      participants: [{ nodeId: 'N1', role: 'partner' }, { nodeId: 'N2', role: 'partner' }],
    }],
  }, { defaultLinkTypes, graphIndex, normalizeGraphStyle, familySchema });
  assert.equal(v5.familyRelations[0].id, 'F1');
  assert.equal(v5.migratedLegacyFamily, false);

  const v4 = normalizeImportedGraph({
    links: [{ id: 'L1', source: 'N1', target: 'N2', familyRelation: 'sibling' }],
    nodes: [{ id: 'N1', name: 'A' }, { id: 'N2', name: 'B' }],
  }, { defaultLinkTypes, graphIndex, normalizeGraphStyle, familySchema });
  assert.equal(v4.familyRelations[0].kind, 'kinship');
  assert.equal(v4.migratedLegacyFamily, true);
});

test('exports a complete v5 graph without d3 runtime fields', () => {
  const state = {
    nodes: [{
      id: 'N1', name: 'A', aliases: ['The First'], titles: ['Queen'],
      birth: { year: 1900 }, generationLabel: '第一代', x: 10, y: 20, vx: 3, vy: -2, index: 0,
    }, { id: 'N2', name: 'B' }],
    links: [{ id: 'L1', source: { id: 'N1' }, target: { id: 'N2' }, label: 'knows', type: 'relation', index: 0 }],
    tagCategories: [],
    nextId: 4,
    graphStyle: { nodeLabelPlacement: 'inside' },
    graphBackgroundColor: '#101114',
    linkTypes: defaultLinkTypes,
    clusterSpacing: 1.4,
    topologySizing: { mode: 'degree', strength: 0.9 },
    datasetMeta: {
      title: 'Season graph',
      description: 'Episode precise',
      sources: [{ id: 'source', label: 'Guide', url: 'https://example.com', usage: 'Audit' }],
      coveragePolicy: { included: 'Named characters' },
      episodeGuide: [{ season: 2, episode: 1, title: 'Episode one', eventNodeIds: ['N1'] }],
    },
    forceConfig: { centerStrength: 0.05, chargeStrength: -500, linkStrength: 0.6, linkDistance: 180 },
    familyRelations: [{
      id: 'F1', kind: 'union', subtype: 'political_union',
      participants: [{ nodeId: 'N1', role: 'partner' }, { nodeId: 'N2', role: 'partner' }],
      certainty: 'confirmed',
    }],
    familyView: { layoutMode: 'house', generationGap: 210 },
  };

  const result = buildExportGraph(state, { normalizeGraphStyle, familySchema });

  assert.equal(result.version, 5);
  assert.deepEqual(result.nodes[0].aliases, ['The First']);
  assert.deepEqual(result.nodes[0].titles, ['Queen']);
  assert.equal(result.nodes[0].generationLabel, '第一代');
  assert.equal('vx' in result.nodes[0], false);
  assert.equal('index' in result.links[0], false);
  assert.equal(result.links[0].source, 'N1');
  assert.equal(result.links[0].target, 'N2');
  assert.equal(result.familyRelations[0].subtype, 'political_union');
  assert.equal(result.familyView.layoutMode, 'house');
  assert.equal(result.graphBackgroundColor, '#101114');
  assert.equal(result.title, 'Season graph');
  assert.equal(result.description, 'Episode precise');
  assert.equal(result.sources[0].id, 'source');
  assert.equal(result.coveragePolicy.included, 'Named characters');
  assert.equal(result.episodeGuide[0].title, 'Episode one');
});

test('builds an explicit v4 compatibility export and reports losses', () => {
  const state = {
    nodes: [{ id: 'N1', name: 'A' }, { id: 'N2', name: 'B' }, { id: 'N3', name: 'C' }],
    links: [
      { id: 'L1', source: { id: 'N1' }, target: { id: 'N3' }, label: 'ordinary', type: 'relation' },
      { id: 'LOLD', source: { id: 'N1' }, target: { id: 'N2' }, familyRelation: 'spouse' },
    ],
    familyRelations: [{
      id: 'F1', kind: 'union', subtype: 'partnership', certainty: 'disputed',
      participants: [
        { nodeId: 'N1', role: 'partner' }, { nodeId: 'N2', role: 'partner' }, { nodeId: 'N3', role: 'partner' },
      ],
    }],
  };

  const result = buildLegacyExportGraph(state, { normalizeGraphStyle, familySchema });

  assert.equal(result.data.version, 4);
  assert.equal('familyRelations' in result.data, false);
  assert.equal('familyView' in result.data, false);
  assert.equal(result.data.links.some((link) => link.id === 'L1'), true);
  assert.equal(result.data.links.some((link) => link.id === 'LOLD'), false);
  assert.equal(result.losses.some((loss) => loss.code === 'MULTI_PARTICIPANT_UNION'), true);
  assert.equal(result.losses.some((loss) => loss.code === 'RELATION_METADATA'), true);
});
