const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildGraphIndex,
  resolveLinkEndpoints,
  firstEpisodeIndex,
} = require('../graph-index.js');

test('resolves link endpoints in O(N+E) style using node ids', () => {
  const nodes = [
    { id: 'N1', name: 'A' },
    { id: 'N2', name: 'B' },
    { id: 'N3', name: 'C' },
  ];
  const links = [
    { id: 'L1', source: 'N1', target: 'N2' },
    { id: 'L2', source: { id: 'N2' }, target: 'N3' },
    { id: 'L3', source: 'N404', target: 'N1' },
  ];

  const resolved = resolveLinkEndpoints(nodes, links);

  assert.equal(resolved.links.length, 2);
  assert.equal(resolved.dropped.length, 1);
  assert.equal(resolved.links[0].source, nodes[0]);
  assert.equal(resolved.links[0].target, nodes[1]);
  assert.equal(resolved.links[1].source, nodes[1]);
  assert.equal(resolved.links[1].target, nodes[2]);
});

test('builds degree and adjacency maps from visible and hidden links', () => {
  const nodes = [{ id: 'N1' }, { id: 'N2' }, { id: 'N3' }];
  const links = [
    { id: 'L1', source: nodes[0], target: nodes[1] },
    { id: 'L2', source: nodes[0], target: nodes[2], hidden: true },
  ];

  const index = buildGraphIndex(nodes, links);

  assert.deepEqual(Object.fromEntries(index.degrees), { N1: 1, N2: 1, N3: 0 });
  assert.deepEqual(index.linksByNodeId.get('N1').map(l => l.id), ['L1']);
  assert.deepEqual(index.linksByNodeIdIncludingHidden.get('N1').map(l => l.id), ['L1', 'L2']);
});

test('calculates first episode indices from a stable episode list', () => {
  const episodeList = [
    { season: 3, episode: 1, sequence: 0 },
    { season: 3, episode: 2, sequence: 0 },
    { season: 3, episode: 2, sequence: 1 },
  ];

  assert.equal(firstEpisodeIndex([{ season: 3, episode: 2, sequence: 1 }], episodeList), 2);
  assert.equal(firstEpisodeIndex([{ season: 4, episode: 1 }], episodeList), Infinity);
  assert.equal(firstEpisodeIndex([], episodeList), Infinity);
});
