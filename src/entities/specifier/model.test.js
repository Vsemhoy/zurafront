import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changedSpecificationFields, itemDescendants, moveSpecificationItem, specificationDraftKey, specificationItemLink, specificationOutline } from './model.js';

const items = [{ id: 'a', parent_id: null, sort_order: 1000, number: 7 }, { id: 'b', parent_id: 'a', sort_order: 1000, number: 8 }, { id: 'c', parent_id: null, sort_order: 2000, number: 9 }, { id: 'd', parent_id: 'c', sort_order: 1000, number: 10 }];

test('outline computes numbering from the hierarchy without changing permanent IDs or numbers', () => {
  assert.deepEqual(specificationOutline(items).map(({ id, outline, number }) => [id, outline, number]), [['a', '1', 7], ['b', '1.1', 8], ['c', '2', 9], ['d', '2.1', 10]]);
  const moved = moveSpecificationItem(items, 'c', -1);
  const updated = items.map((item) => ({ ...item, ...moved.find((row) => row.id === item.id) }));
  assert.deepEqual(specificationOutline(updated).map(({ id, outline, number }) => [id, outline, number]), [['c', '1', 9], ['d', '1.1', 10], ['a', '2', 7], ['b', '2.1', 8]]);
  assert.equal(items[0].sort_order, 1000);
});

test('moving a sibling preserves every node, parent and unrelated sibling order', () => {
  assert.equal(moveSpecificationItem(items, 'a', -1), null);
  assert.equal(moveSpecificationItem(items, 'missing', 1), null);
  assert.equal(moveSpecificationItem(items, 'b', 1), null);
  const moved = moveSpecificationItem(items, 'a', 1);
  assert.equal(moved.length, 4);
  assert.equal(moved.find((row) => row.id === 'b').parent_id, 'a');
  assert.equal(moved.find((row) => row.id === 'd').sort_order, 1000);
});

test('parent choices can exclude descendants and corrupted cycles do not hang the outline', () => {
  assert.deepEqual([...itemDescendants(items, 'a')], ['a', 'b']);
  const broken = [{ id: 'x', parent_id: 'y' }, { id: 'y', parent_id: 'x' }, { id: 'z', parent_id: 'missing' }];
  assert.equal(specificationOutline(broken).length, 3);
  assert.equal(itemDescendants(broken, 'x').size, 2);
});

test('deep outlines use iterative traversal and keep all nested points visible', () => {
  const deep = Array.from({ length: 1500 }, (_, index) => ({ id: `${index}`, parent_id: index ? `${index - 1}` : null }));
  const outline = specificationOutline(deep);
  assert.equal(outline.length, 1500);
  assert.equal(outline.at(-1).depth, 1499);
});

test('partial edits never resend unrelated status/content or treat revision changes as user edits', () => {
  const baseline = { revision: 4, title: 'Original', content: 'Preserve', acceptance_status: 'unchecked' };
  assert.deepEqual(changedSpecificationFields({ ...baseline, revision: 5, title: 'New' }, baseline), { title: 'New' });
  assert.equal(specificationDraftKey(baseline), specificationDraftKey({ ...baseline, revision: 8 }));
  assert.equal(specificationItemLink('scope', 'doc', 'node'), '/specifications/scope/doc?item=node');
});
