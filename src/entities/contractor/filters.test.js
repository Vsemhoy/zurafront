import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterContractors } from './filters.js';

const people = [
  { id: 'one', name: 'Эндрю', type: 'real', email: 'andrew@example.test' },
  { id: 'two', name: 'Виртуальный коллега', type: 'virtual', username: 'colleague' },
  { id: 'three', name: 'Агент', type: 'agent' },
];
const departments = [
  { id: 'it', members: [{ user_id: 'one' }, { user_id: 'three' }] },
  { id: 'sales', members: [{ user_id: 'two' }] },
  { id: 'empty', members: [] },
];

test('all departments includes people without department information', () => {
  assert.deepEqual(filterContractors(people), people);
});

test('department filter uses membership in the current scope', () => {
  assert.deepEqual(filterContractors(people, { departments, departmentId: 'it' }).map((person) => person.id), ['one', 'three']);
  assert.deepEqual(filterContractors(people, { departments: [{ id: 'it', members: [{ user_id: 'two' }] }], departmentId: 'it' }), [people[1]]);
});

test('department filter combines with type and case-insensitive search', () => {
  assert.deepEqual(filterContractors(people, { departments, departmentId: 'it', type: 'real', search: ' ANDREW ' }), [people[0]]);
  assert.deepEqual(filterContractors(people, { departments, departmentId: 'it', search: 'colleague' }), []);
});

test('empty, missing and deleted departments never show unrelated people', () => {
  for (const departmentId of ['empty', 'missing']) {
    assert.deepEqual(filterContractors(people, { departments, departmentId }), []);
  }
  assert.deepEqual(filterContractors(people, { departmentId: 'it' }), []);
});

test('clearing the department selection restores all matching users', () => {
  assert.deepEqual(filterContractors(people, { departments, departmentId: '', type: 'virtual', search: 'colleague' }), [people[1]]);
});
