import test from 'node:test';
import assert from 'node:assert/strict';
import { isSupportedBookBlock, visibleBookGroups, visibleBookSnapshot } from './blocks.js';

test('legacy drawing blocks are omitted without mutating stored content or order', () => {
  const groups = [{ id: 'text', type: 'markdown' }, { id: 'old', type: 'excalidraw', master_block: { payload: { scene: { elements: ['keep'] } } } }, { id: 'svg', type: 'svg' }];
  const original = structuredClone(groups);
  assert.deepEqual(visibleBookGroups(groups).map(({ id }) => id), ['text', 'svg']);
  assert.deepEqual(groups, original);
  assert.equal(isSupportedBookBlock('excalidraw'), false);
  assert.equal(isSupportedBookBlock('embed'), true);
  assert.deepEqual(visibleBookGroups(), []);
});

test('history presentation skips legacy scenes while retaining the original snapshot', () => {
  const snapshot = { page: { title: 'Page' }, blocks: [{ group: { type: 'excalidraw' }, block: { payload: { scene: 'keep' } } }, { group: { type: 'code' }, block: { content: 'x()' } }] };
  assert.deepEqual(visibleBookSnapshot(snapshot).blocks, [snapshot.blocks[1]]);
  assert.equal(snapshot.blocks.length, 2);
});
