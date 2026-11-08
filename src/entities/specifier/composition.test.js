import assert from 'node:assert/strict';
import test from 'node:test';
import { documentBlocks, movePlacedItem, moveSpecificationBlock, newSpecificationBlock, placedItemIds, removeSpecificationBlock, specificationPlacementOrder, ungroupedSubpoints, ungroupedSubpointsId } from './composition.js';
import { specificationOutline } from './model.js';

const points = [
  { id: 'a', parent_id: null, sort_order: 1, number: 12 },
  { id: 'b', parent_id: 'a', sort_order: 3, number: 13 },
  { id: 'c', parent_id: null, sort_order: 2, number: 14 },
  { id: 'd', parent_id: 'a', sort_order: 4, number: 15 },
];
const blocks = [
  { id: 'm1', type: 'master', item_ids: ['a', 'b'] },
  { id: 'line', type: 'divider' },
  { id: 'm2', type: 'master', item_ids: ['c', 'd'] },
];

test('old documents and snapshots render their original depth-first order in one master', () => {
  assert.deepEqual(documentBlocks({ id: 'legacy-doc' }, points), [{ id: 'legacy-doc', type: 'master', item_ids: ['a', 'b', 'd', 'c'] }]);
});

test('moving a child into another master changes sibling numbering without changing parent or permanent numbers', () => {
  const result = movePlacedItem(blocks, 'b', 'm2');
  assert.deepEqual(placedItemIds(result), ['a', 'c', 'd', 'b']);
  assert.deepEqual(specificationOutline(points, placedItemIds(result)).map(({ id, outline, parent_id, number }) => [id, outline, parent_id, number]), [
    ['a', '1', null, 12], ['d', '1.1', 'a', 15], ['b', '1.2', 'a', 13], ['c', '2', null, 14],
  ]);
  assert.deepEqual(blocks[0].item_ids, ['a', 'b']);
});

test('dropping before a point preserves exact placement and ignores stale or invalid targets', () => {
  const result = movePlacedItem(blocks, 'b', 'm2', 'c');
  assert.deepEqual(result[2].item_ids, ['b', 'c', 'd']);
  assert.strictEqual(movePlacedItem(blocks, 'b', 'm2', 'b'), blocks);
  assert.strictEqual(movePlacedItem(blocks, 'b', 'line'), blocks);
  assert.strictEqual(movePlacedItem(blocks, 'foreign', 'm1'), blocks);
});

test('moving a master updates root numbers globally; nonstructural blocks consume no numbers', () => {
  const result = moveSpecificationBlock(moveSpecificationBlock(blocks, 'm2', -1), 'm2', -1);
  const labels = specificationOutline(points, placedItemIds(result)).map(({ id, outline }) => [id, outline]);
  assert.deepEqual(labels, [['c', '1'], ['a', '2'], ['d', '2.1'], ['b', '2.2']]);
});

test('removing a master keeps every point and leaves at least one master available', () => {
  const result = removeSpecificationBlock(blocks, 'm1');
  assert.deepEqual(result[1].item_ids, ['a', 'b', 'c', 'd']);
  assert.strictEqual(removeSpecificationBlock(result, 'm2'), result);
  assert.deepEqual(removeSpecificationBlock(blocks, 'm2')[0].item_ids, ['a', 'b', 'c', 'd']);
});

test('new blocks have sortable ULIDs and only navigation groups carry placements', () => {
  const first = newSpecificationBlock('master');
  assert.match(first.id, /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/);
  assert.deepEqual(first.item_ids, []);
  const second = newSpecificationBlock('code');
  assert.notEqual(second.id, first.id);
  assert.equal('item_ids' in second, false);
});

test('local groups order only direct children, with continuous numbering across content blocks and groups', () => {
  const items = [
    { ...points[0], blocks: [{ id: 'g1', type: 'subpoints', item_ids: ['d', 'c', 'deep'] }, blocks[1], { id: 'g2', type: 'subpoints', item_ids: ['b'] }] },
    ...points.slice(1),
    { id: 'deep', parent_id: 'b', sort_order: 100, number: 16 },
    { id: 'unplaced', parent_id: 'a', sort_order: 5, number: 17 },
  ];
  const placement = specificationPlacementOrder(items, blocks);
  assert.deepEqual(placement, ['d', 'b', 'a', 'c']);
  assert.deepEqual(specificationOutline(items, placement).map(({ id, outline, number }) => [id, outline, number]), [
    ['a', '1', 12], ['d', '1.1', 15], ['b', '1.2', 13], ['deep', '1.2.1', 16], ['unplaced', '1.3', 17], ['c', '2', 14],
  ]);
});

test('moving children into and out of local groups keeps each child visible once', () => {
  const group = newSpecificationBlock('subpoints');
  const direct = [points[1], points[3]];
  const virtual = { id: ungroupedSubpointsId, type: 'subpoints', item_ids: ['b', 'd'] };
  const assigned = movePlacedItem([group, virtual], 'b', group.id);
  assert.deepEqual(assigned.map(({ item_ids }) => item_ids), [['b'], ['d']]);
  assert.deepEqual(ungroupedSubpoints(assigned.slice(0, 1), direct).map(({ id }) => id), ['d']);
  const released = movePlacedItem(assigned, 'b', virtual.id);
  assert.deepEqual(released.map(({ item_ids }) => item_ids), [[], ['d', 'b']]);
  assert.deepEqual(removeSpecificationBlock(assigned.slice(0, 1), group.id), []);
  assert.deepEqual(ungroupedSubpoints([], direct), direct);
});
