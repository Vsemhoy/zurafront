import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrail, followNode, moveTrail, rememberVisit, zoomAt, fitDiagram, diagramPoint, selectionRegion, nodeFromHref } from './model.js';
const a = { type: 'diagram', id: 'a', title: 'A' }, b = { type: 'task', id: 'b', title: 'B' };
test('cycles append visits without recursion or changing a document parent', () => {
  const trail = followNode(followNode(createTrail(a), b), a);
  assert.deepEqual(trail.visits.map((node) => node.id), ['a', 'b', 'a']);
  assert.equal(trail.cursor, 2);
});
test('back and forward keep separate view positions even on repeated documents', () => {
  const start = rememberVisit(createTrail(a), { view: { pageId: 'one', transform: { scale: 2, x: 10, y: 20 } } });
  const trail = rememberVisit(followNode(followNode(start, b), a), { view: { pageId: 'two' } });
  const back = moveTrail(trail, 0);
  assert.equal(back.visits[back.cursor].view.pageId, 'one');
  const forward = moveTrail(back, 2);
  assert.equal(forward.visits[forward.cursor].view.pageId, 'two');
});
test('following a new branch after going back discards only forward history', () => {
  const trail = followNode(moveTrail(followNode(createTrail(a), b), 0), { type: 'lore', id: 'c' });
  assert.deepEqual(trail.visits.map((node) => node.id), ['a', 'c']);
  assert.equal(moveTrail(trail, -100).cursor, 0);
  assert.equal(moveTrail(trail, 100).cursor, 1);
});
test('zoom preserves the diagram point under the pointer and clamps extreme input', () => {
  assert.deepEqual(zoomAt({ scale: 1, x: 10, y: 20 }, { x: 100, y: 100 }, 2), { scale: 2, x: -80, y: -60 });
  assert.equal(zoomAt({ scale: 1, x: 0, y: 0 }, { x: 0, y: 0 }, 1000).scale, 64);
  assert.equal(zoomAt({ scale: 1, x: 0, y: 0 }, { x: 0, y: 0 }, 0).scale, .005);
});
test('fit centers large diagrams and regions use normalized document coordinates', () => {
  assert.deepEqual(fitDiagram({ width: 1048, height: 548 }, { width: 2000, height: 1000 }), { scale: .5, x: 24, y: 24 });
  assert.deepEqual(diagramPoint({ x: 524, y: 274 }, { scale: .5, x: 24, y: 24 }, { width: 2000, height: 1000 }), { x: .5, y: .5 });
  assert.deepEqual(fitDiagram({ width: 1148, height: 598 }, { width: 2000, height: 1000 }, .05), { scale: .5, x: 74, y: 49 });
  assert.deepEqual(diagramPoint({ x: 24, y: 24 }, { scale: .5, x: 74, y: 49 }, { width: 2000, height: 1000 }, .05), { x: -.05, y: -.05 });
  assert.deepEqual(selectionRegion({ x: .8, y: .6 }, { x: .1, y: .2 }, 'p'), { page_id: 'p', x: .1, y: .2, width: .7000000000000001, height: .39999999999999997 });
  assert.equal(selectionRegion({ x: .2, y: .3 }, { x: .2, y: .4 }, 'p'), null);
});
test('internal Markdown links become nodes only for the correct origin and scope', () => {
  const scope = '01m1e2jr7p62bd355k3a9tqqbs', id = '01m1e5656tgpwjvj190jvkema3', origin = 'https://zuratax.com';
  assert.deepEqual(nodeFromHref(`/content/diagrams/${scope}/${id}`, scope, origin), { type: 'diagram', id });
  assert.deepEqual(nodeFromHref(`/lore/${scope}/${id}`, scope, origin), { type: 'lore', id });
  assert.deepEqual(nodeFromHref(`/tasks/${id}/edit`, scope, origin), { type: 'task', id });
  assert.deepEqual(nodeFromHref(`/content/lightbooks/${id}`, scope, origin), { type: 'lightbook', id });
  assert.deepEqual(nodeFromHref(`/content/lightbooks/${id}/blocks/${scope}`, scope, origin), { type: 'lightbook', id });
  assert.deepEqual(nodeFromHref(`/content/files?file=${id}`, scope, origin), { type: 'file', id });
  assert.equal(nodeFromHref(`https://external.test/tasks/${id}`, scope, origin), null);
  assert.equal(nodeFromHref(`/lore/${id}/${id}`, scope, origin), null);
  assert.equal(nodeFromHref('javascript:alert(1)', scope, origin), null);
});
