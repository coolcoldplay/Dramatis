const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const familyValidator = require('../src/family/family-validator.js');

const datasetPath = path.join(__dirname, '..', 'data', 'twin-peaks-season-2.json');
const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

function episodeKey(value) {
  return `S${value.season}E${value.episode}`;
}

test('covers every Season 2 episode with metadata and event nodes', () => {
  assert.equal(dataset.version, 5);
  assert.deepEqual(
    dataset.episodeGuide.map((item) => item.raw),
    Array.from({ length: 22 }, (_, index) => `S2E${index + 1}`)
  );

  const nodeIds = new Set(dataset.nodes.map((node) => node.id));
  dataset.episodeGuide.forEach((episode) => {
    assert.ok(episode.title);
    assert.ok(episode.englishTitle);
    assert.ok(episode.summary);
    assert.match(episode.airDate, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(episode.eventNodeIds.length >= 5, `${episode.raw} has too few event nodes`);
    assert.ok(episode.participantNodeIds.length >= 10, `${episode.raw} has too few participants`);
    episode.eventNodeIds.forEach((id) => assert.ok(nodeIds.has(id), `${episode.raw}: ${id}`));
    episode.participantNodeIds.forEach((id) => assert.ok(nodeIds.has(id), `${episode.raw}: ${id}`));
  });
});

test('keeps every event link at single-episode precision', () => {
  const eventNodes = new Map(
    dataset.nodes
      .filter((node) => node.id.startsWith('event-'))
      .map((node) => [node.id, node])
  );
  assert.ok(eventNodes.size >= 140);

  dataset.links
    .filter((link) => eventNodes.has(link.target))
    .forEach((link) => {
      const eventNode = eventNodes.get(link.target);
      assert.equal(link.type, 'action');
      assert.equal(link.episodes.length, 1, link.id);
      assert.equal(eventNode.episodes.length, 1, eventNode.id);
      assert.equal(episodeKey(link.episodes[0]), episodeKey(eventNode.episodes[0]), link.id);
    });
});

test('contains no missing endpoints, duplicate ids, isolated people, or bad coordinates', () => {
  const nodeIds = new Set();
  dataset.nodes.forEach((node) => {
    assert.ok(node.id);
    assert.ok(!nodeIds.has(node.id), `duplicate node ${node.id}`);
    nodeIds.add(node.id);
    assert.ok(Number.isFinite(node.x), `${node.id} x`);
    assert.ok(Number.isFinite(node.y), `${node.id} y`);
  });

  const linkIds = new Set();
  const connected = new Set();
  dataset.links.forEach((link) => {
    assert.ok(!linkIds.has(link.id), `duplicate link ${link.id}`);
    linkIds.add(link.id);
    assert.ok(nodeIds.has(link.source), `${link.id} source ${link.source}`);
    assert.ok(nodeIds.has(link.target), `${link.id} target ${link.target}`);
    connected.add(link.source);
    connected.add(link.target);
  });

  dataset.nodes
    .filter((node) => node.id.startsWith('person-'))
    .forEach((node) => assert.ok(connected.has(node.id), `isolated ${node.id}`));
});

test('preserves readable Chinese text without replacement or common mojibake markers', () => {
  const text = JSON.stringify(dataset);
  assert.equal(text.includes('\uFFFD'), false);
  ['锟', '烫烫烫', '屯屯屯'].forEach((marker) => assert.equal(text.includes(marker), false));
  assert.ok(dataset.nodes.some((node) => node.name === '戴尔·库珀'));
  assert.ok(dataset.nodes.some((node) => node.name === '劳拉·帕尔默'));
});

test('passes the v5 family graph validator without diagnostics', () => {
  const diagnostics = familyValidator.validateFamilyGraph(dataset.nodes, dataset.familyRelations);
  assert.deepEqual(diagnostics, []);
  assert.equal(dataset.familyRelations.length, 30);
});
