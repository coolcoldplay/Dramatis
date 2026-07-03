const assert = require('node:assert/strict');
const test = require('node:test');

const {
  findMatchingNodeIds,
  isHelpShortcut,
  isSearchFocusShortcut,
  normalizeSearchQuery,
} = require('../search-highlight.js');

const tagCategories = [
  {
    id: 'C1',
    name: 'Role',
    tags: [
      { id: 'T1', name: 'Detective' },
      { id: 'T2', name: 'Hotel' },
    ],
  },
];

const nodes = [
  { id: 'N1', name: 'Dale Cooper', notes: 'FBI special agent', tags: { C1: 'T1' } },
  { id: 'N2', name: 'Laura Palmer', notes: 'Town mystery', tags: {} },
  { id: 'N3', name: 'Audrey Horne', notes: '', tags: { C1: 'T2' }, hidden: true },
];

test('normalizes search query for case-insensitive matching', () => {
  assert.equal(normalizeSearchQuery('  Cooper  '), 'cooper');
  assert.equal(normalizeSearchQuery(null), '');
});

test('finds matching node ids from names by default', () => {
  assert.deepEqual(findMatchingNodeIds(nodes, 'cooper', tagCategories), ['N1']);
  assert.deepEqual(findMatchingNodeIds(nodes, 'mystery', tagCategories), []);
  assert.deepEqual(findMatchingNodeIds(nodes, 'detective', tagCategories), []);
});

test('expands matching to notes and visible tag labels when fuzzy search is enabled', () => {
  assert.deepEqual(findMatchingNodeIds(nodes, 'mystery', tagCategories, { fuzzy: true }), ['N2']);
  assert.deepEqual(findMatchingNodeIds(nodes, 'detective', tagCategories, { fuzzy: true }), ['N1']);
});

test('ignores hidden nodes and empty queries when searching', () => {
  assert.deepEqual(findMatchingNodeIds(nodes, '', tagCategories), []);
  assert.deepEqual(findMatchingNodeIds(nodes, 'hotel', tagCategories, { fuzzy: true }), []);
});

test('recognizes search and help shortcuts outside editable controls', () => {
  assert.equal(isSearchFocusShortcut({ key: '/', target: { tagName: 'BODY' } }), true);
  assert.equal(isSearchFocusShortcut({ key: '/', target: { tagName: 'INPUT' } }), false);
  assert.equal(isSearchFocusShortcut({ key: '/', ctrlKey: true, target: { tagName: 'BODY' } }), false);

  assert.equal(isHelpShortcut({ key: '?', target: { tagName: 'BODY' } }), true);
  assert.equal(isHelpShortcut({ key: '/', shiftKey: true, target: { tagName: 'BODY' } }), true);
  assert.equal(isHelpShortcut({ key: '?', target: { tagName: 'TEXTAREA' } }), false);
});
