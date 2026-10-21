import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newThing, thingPayload } from './model.js';

test('new equipment starts as a standalone item and carries its department context', () => {
  assert.equal(newThing('department').container_kind, 'none');
  assert.equal(newThing('department').department_id, 'department');
});

test('creation sends the chosen physical or logical container kind', () => {
  assert.equal(thingPayload({ ...newThing(), container_kind: 'physical' }).container_kind, 'physical');
  assert.equal(thingPayload({ ...newThing(), container_kind: 'logical' }).container_kind, 'logical');
  assert.equal(thingPayload({ ...newThing(), container_kind: undefined }).container_kind, 'none');
});

test('normal card edits never submit container kind or composition fields', () => {
  const payload = thingPayload({ ...newThing(), container_kind: 'physical', revision: 4, parent_id: 'not-a-card-field' }, true);
  assert.equal(Object.hasOwn(payload, 'container_kind'), false);
  assert.equal(Object.hasOwn(payload, 'parent_id'), false);
  assert.equal(payload.revision, 4);
});
