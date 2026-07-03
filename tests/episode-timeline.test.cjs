const assert = require('node:assert/strict');
const test = require('node:test');

const {
  collectAllEpisodes,
  episodeIndexInList,
  episodeToString,
  parseEpisodes,
  parseEpisodesPreserveSeq,
  resolveEpisode,
} = require('../src/episode-timeline.js');

test('parses and sorts season episode tokens', () => {
  assert.deepEqual(parseEpisodes('S3E2, s1e4 S3E1'), [
    { season: 1, episode: 4, raw: 'S1E4' },
    { season: 3, episode: 1, raw: 'S3E1' },
    { season: 3, episode: 2, raw: 'S3E2' },
  ]);
});

test('preserves existing duplicate episode sequence values', () => {
  const parsed = parseEpisodesPreserveSeq('S3E2 S3E4', [
    { season: 3, episode: 2, sequence: 7 },
  ]);

  assert.equal(parsed[0].sequence, 7);
  assert.equal(parsed[1].sequence, undefined);
});

test('collects unique episodes from nodes and links', () => {
  const nodes = [
    { episodes: [{ season: 3, episode: 1 }, { season: 3, episode: 2, sequence: 1 }] },
  ];
  const links = [
    { episodes: [{ season: 3, episode: 2, sequence: 1 }, { season: 2, episode: 9 }] },
  ];

  assert.deepEqual(collectAllEpisodes(nodes, links), [
    { season: 2, episode: 9 },
    { season: 3, episode: 1 },
    { season: 3, episode: 2, sequence: 1 },
  ]);
});

test('formats, resolves, and indexes episodes', () => {
  const list = [
    { season: 3, episode: 1 },
    { season: 3, episode: 2, sequence: 0 },
    { season: 3, episode: 2, sequence: 3 },
  ];

  assert.equal(episodeToString({ season: 3, episode: 2 }), 'S3E2');
  assert.deepEqual(resolveEpisode({ season: 3, episode: 2 }, list), list[2]);
  assert.equal(episodeIndexInList({ season: 3, episode: 2, sequence: 3 }, list), 2);
  assert.equal(episodeIndexInList({ season: 9, episode: 1 }, list), -1);
});
