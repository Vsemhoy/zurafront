import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultPlanFilters, loadPlanFilters, planFiltersKey, savePlanFilters } from './filters.js';

const department = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
const project = '01ARZ3NDEKTSV4RRFFQ69G5FAW';
const person = '01ARZ3NDEKTSV4RRFFQ69G5FAX';
const storage = () => {
  const items = new Map();
  return { getItem: (key) => items.get(key) ?? null, setItem: (key, value) => items.set(key, value) };
};

test('plan filters restore every selection but reset pagination', () => {
  const browser = storage();
  const filters = { year: '2027', month: '2027-03', department_id: department, project_id: project, assignee_id: person, status: 'open', q: 'Резервы', page: 8 };
  savePlanFilters('plans', filters, browser);
  assert.deepEqual(loadPlanFilters('plans', 2026, browser), { ...filters, year: 2027, page: 1 });
});

test('filters never leak between scopes or signed-in users', () => {
  const browser = storage();
  savePlanFilters(planFiltersKey('alice', 'work'), { ...defaultPlanFilters(2026), department_id: department }, browser);
  assert.equal(loadPlanFilters(planFiltersKey('alice', 'work'), 2026, browser).department_id, department);
  assert.equal(loadPlanFilters(planFiltersKey('alice', 'home'), 2026, browser).department_id, '');
  assert.equal(loadPlanFilters(planFiltersKey('bob', 'work'), 2026, browser).department_id, '');
});

test('broken or missing storage falls back to default filters', () => {
  for (const value of ['broken JSON', 'null', '[]', 'false']) {
    assert.deepEqual(loadPlanFilters('plans', 2026, { getItem: () => value }), defaultPlanFilters(2026));
  }
  const blocked = { getItem() { throw Error('Blocked'); }, setItem() { throw Error('Full'); } };
  assert.deepEqual(loadPlanFilters('plans', 2026, blocked), defaultPlanFilters(2026));
  assert.doesNotThrow(() => savePlanFilters('plans', defaultPlanFilters(2026), blocked));
});

test('invalid filter values and mismatched months are discarded', () => {
  const browser = storage();
  browser.setItem('plans', JSON.stringify({ year: 1900, month: '2027-03', project_id: {}, department_id: 'bad', assignee_id: 5, status: 'unknown', q: 'x'.repeat(200), page: 12 }));
  assert.deepEqual(loadPlanFilters('plans', 2026, browser), { ...defaultPlanFilters(2026), q: 'x'.repeat(150) });
});

test('clearing filters persists empty selections instead of restoring old values', () => {
  const browser = storage();
  savePlanFilters('plans', { ...defaultPlanFilters(2026), department_id: department, project_id: project }, browser);
  savePlanFilters('plans', defaultPlanFilters(2026), browser);
  assert.deepEqual(loadPlanFilters('plans', 2026, browser), defaultPlanFilters(2026));
});
