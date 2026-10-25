import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultStructureFilters, descendantsOf, loadStructureFilters, saveStructureFilters, sectionChoices, sectionTree, structureDefaults, structureFiltersKey } from './structure.js';

const id = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
const storage = () => { const items = new Map(); return { getItem: (key) => items.get(key) ?? null, setItem: (key, value) => items.set(key, value) }; };

test('section, category and project restore independently for one user, scope and module', () => {
  const browser = storage();
  const key = structureFiltersKey('alice', 'work', 'eventor');
  const filters = { ...defaultStructureFilters(), project_id: 'none', section_id: id, category_id: 'none', type_id: id, requester_id: id, created_by: id, importance: 'important', q: 'Найти' };
  saveStructureFilters(key, filters, browser);
  assert.deepEqual(loadStructureFilters(key, browser), filters);
  for (const other of [structureFiltersKey('alice', 'home', 'eventor'), structureFiltersKey('bob', 'work', 'eventor'), structureFiltersKey('alice', 'work', 'lightbook')]) {
    assert.deepEqual(loadStructureFilters(other, browser), defaultStructureFilters());
  }
});

test('malformed stored filters and broken storage never crash the page', () => {
  for (const value of ['no json', 'null', '[]', 'false', '{"project_id":{},"section_id":"bad-id","category_id":3,"type_id":"none","importance":"unknown"}']) {
    assert.deepEqual(loadStructureFilters('key', { getItem: () => value }), defaultStructureFilters());
  }
  const broken = { getItem() { throw Error('Blocked'); }, setItem() { throw Error('Full'); } };
  assert.deepEqual(loadStructureFilters('key', broken), defaultStructureFilters());
  assert.doesNotThrow(() => saveStructureFilters('key', {}, broken));
});

test('all and none filters are never sent as entity identifiers at creation', () => {
  assert.deepEqual(structureDefaults({ project_id: 'none', section_id: id, category_id: 'none' }), { project_id: '', section_id: id, category_id: '' });
  assert.deepEqual(structureDefaults(), { project_id: '', section_id: '', category_id: '' });
  assert.deepEqual(structureDefaults({ project_id: id, section_id: '', category_id: id }), { project_id: id, section_id: '', category_id: id });
});

test('tree respects sibling order, nesting and inherited archive without changing source records', () => {
  const rows = [{ id: 'child', name: 'Дочерняя', parent_id: 'root' }, { id: 'second', name: 'Вторая', sort_order: 2 }, { id: 'root', name: 'Первая', sort_order: 1, is_archived: true }];
  const tree = sectionTree(rows);
  assert.deepEqual(tree.map(({ id, depth, archived }) => ({ id, depth, archived })), [
    { id: 'root', depth: 0, archived: true }, { id: 'child', depth: 1, archived: true }, { id: 'second', depth: 0, archived: false },
  ]);
  assert.equal(tree[0].hasChildren, true);
  assert.equal(rows[0].depth, undefined);
});

test('parent selector excludes itself and descendants; archived current value stays visible', () => {
  const rows = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B', parent_id: 'a' }, { id: 'c', name: 'C', parent_id: 'b' }, { id: 'd', name: 'D', is_archived: true }, { id: 'e', name: 'E', parent_id: 'd' }];
  assert.deepEqual(sectionChoices(rows, '', 'a'), []);
  assert.deepEqual(sectionChoices(rows, 'e').map((row) => row.id), ['a', 'b', 'c', 'e']);
  assert.match(sectionChoices(rows, 'e').at(-1).label, /архив/);
  assert.deepEqual([...descendantsOf(rows, 'a')], ['a', 'b', 'c']);
});

test('corrupt legacy loops cannot hang tree, parent selector or navigation', () => {
  const rows = [{ id: 'a', name: 'A', parent_id: 'b' }, { id: 'b', name: 'B', parent_id: 'a' }, { id: 'c', name: 'C', parent_id: 'missing' }];
  assert.equal(sectionTree(rows).length, 3);
  assert.deepEqual(sectionChoices(rows, '', 'a').map((row) => row.id), ['c']);
  assert.equal(descendantsOf(rows, 'a').size, 2);
});
