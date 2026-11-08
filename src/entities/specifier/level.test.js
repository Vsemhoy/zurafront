import assert from 'node:assert/strict';
import test from 'node:test';
import { specificationLevel, specificationOutline } from './model.js';

const items = [
  { id: 'a', parent_id: null, sort_order: 1 },
  { id: 'a1', parent_id: 'a', sort_order: 2 },
  { id: 'a11', parent_id: 'a1', sort_order: 3 },
  { id: 'a2', parent_id: 'a', sort_order: 4 },
  { id: 'b', parent_id: null, sort_order: 5 },
];
const outline = specificationOutline(items, ['b', 'a', 'a2', 'a1', 'a11']);

test('document root exposes only immediate top-level entries in composition order', () => {
  const level = specificationLevel(outline);
  assert.equal(level.point, null);
  assert.deepEqual(level.children.map(({ id, outline: number }) => [id, number]), [['b', '1'], ['a', '2']]);
});

test('a point page exposes its own content target and only direct children, not neighbors or deeper descendants', () => {
  const level = specificationLevel(outline, 'a');
  assert.equal(level.point.id, 'a');
  assert.deepEqual(level.children.map(({ id, outline: number }) => [id, number]), [['a2', '2.1'], ['a1', '2.2']]);
  assert.deepEqual(level.ancestors, []);
});

test('deep links build breadcrumbs without exposing siblings as page content', () => {
  const level = specificationLevel(outline, 'a11');
  assert.deepEqual(level.ancestors.map(({ id }) => id), ['a', 'a1']);
  assert.deepEqual(level.children, []);
  assert.equal(level.point.outline, '2.2.1');
});

test('invalid point links are flagged instead of selecting the first point', () => {
  const level = specificationLevel(outline, 'deleted');
  assert.equal(level.missing, true);
  assert.equal(level.point, null);
});
