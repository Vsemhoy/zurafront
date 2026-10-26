import test from 'node:test';
import assert from 'node:assert/strict';
import { ledgerCategoryOptions, parseCategoryKeywords, suggestLedgerCategory } from './categories.js';
import { ledgerForm, ledgerPayload, newCategory } from './model.js';
const category = (id, title, extra = {}) => ({ id, title, project_id: 'project', kind: 'both', sort_order: 0, keywords: [], ...extra });

test('category options follow hierarchy and sibling order, with readable paths and inherited archive state', () => {
  const rows = ledgerCategoryOptions([category('child', 'Ремонт', { parent_id: 'root' }), category('root', 'Дом', { is_archived: true }), category('other', 'Прочее', { sort_order: 4 })]);
  assert.deepEqual(rows.map((row) => row.id), ['root', 'child', 'other']);
  assert.equal(rows[1].path, 'Дом / Ремонт');
  assert.equal(rows[1].depth, 1);
  assert.equal(rows[1].parentArchived, true);
  assert.deepEqual(rows[1].ancestorIds, ['root']);
  assert.equal(rows[0].hasChildren, true);
});
test('malformed legacy cycles and orphaned categories stay visible without recursive loops', () => {
  assert.equal(ledgerCategoryOptions([category('a', 'A', { parent_id: 'b' }), category('b', 'B', { parent_id: 'a' }), category('c', 'C', { parent_id: 'missing' })]).length, 3);
});
test('keyword suggestion picks the most distinct matches, handles case, punctuation and phrases', () => {
  const rows = [category('common', 'Общие', { keywords: ['сервер'] }), category('repair', 'Ремонт сети', { keywords: ['сервер', 'ремонт сети', 'СЕРВЕР'] })];
  assert.equal(suggestLedgerCategory('Оплата: СЕРВЕР, ремонт сети!', rows)?.id, 'repair');
  assert.equal(suggestLedgerCategory('крем для рук', [category('x', 'Ремонт', { keywords: ['рем'] })]), null);
  assert.equal(suggestLedgerCategory('Елка', [category('x', 'Праздник', { keywords: ['ёлка'] })])?.id, 'x');
});
test('ties preserve current selection; no match, archived branches and ambiguous new matches do not guess', () => {
  const rows = ['a', 'b'].map((id) => category(id, id, { keywords: ['хостинг'] }));
  assert.equal(suggestLedgerCategory('Хостинг', rows), null);
  assert.equal(suggestLedgerCategory('Хостинг', rows, 'b')?.id, 'b');
  assert.equal(suggestLedgerCategory('Нет совпадений', rows, 'a'), null);
  assert.equal(suggestLedgerCategory('Хостинг', [category('a', 'A', { keywords: ['хостинг'], parentArchived: true })]), null);
});
test('category form saves parent and keyword edits, with stable partial updates and explicit clearing', () => {
  assert.deepEqual(parseCategoryKeywords(' сервер, хостинг\nремонт сети; сервер '), ['сервер', 'хостинг', 'ремонт сети']);
  const initial = ledgerForm('category', { ...newCategory('p'), id: 'cat', revision: 2, title: 'Сеть', parent_id: 'parent', keywords: ['сервер', 'хостинг'] });
  assert.equal(initial.keywords_text, 'сервер, хостинг');
  assert.deepEqual(ledgerPayload('category', { ...initial, title: 'Связь' }, initial), { title: 'Связь', revision: 2 });
  assert.deepEqual(ledgerPayload('category', { ...initial, parent_id: '', keywords_text: '' }, initial), { parent_id: null, keywords: [], revision: 2 });
});
