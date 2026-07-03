const assert = require('node:assert/strict');
const test = require('node:test');

const {
  isToolbarToggleShortcut,
  nextToolbarHidden,
} = require('../toolbar-visibility.js');

test('uses plain T as toolbar visibility shortcut', () => {
  assert.equal(isToolbarToggleShortcut({ key: 't', target: { tagName: 'BODY' } }), true);
  assert.equal(isToolbarToggleShortcut({ key: 'T', target: { tagName: 'DIV' } }), true);
  assert.equal(isToolbarToggleShortcut({ key: 't', ctrlKey: true, target: { tagName: 'BODY' } }), false);
});

test('does not toggle while typing in editable controls', () => {
  assert.equal(isToolbarToggleShortcut({ key: 't', target: { tagName: 'INPUT' } }), false);
  assert.equal(isToolbarToggleShortcut({ key: 't', target: { tagName: 'TEXTAREA' } }), false);
  assert.equal(isToolbarToggleShortcut({ key: 't', target: { tagName: 'SELECT' } }), false);
  assert.equal(isToolbarToggleShortcut({ key: 't', target: { isContentEditable: true } }), false);
});

test('toggles hidden state', () => {
  assert.equal(nextToolbarHidden(false), true);
  assert.equal(nextToolbarHidden(true), false);
});
