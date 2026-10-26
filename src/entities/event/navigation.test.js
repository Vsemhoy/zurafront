import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultStructureFilters } from '../content-navigation/structure.js';
import { eventMonthKey, readEventSearch, writeEventSearch } from './navigation.js';

const now = new Date(2026, 9, 26);
test('a bare Eventor URL restores saved preferences and writes them into a shareable URL', () => {
  const url = new URLSearchParams('event=opened');
  const state = readEventSearch(url, { view: 'days', filters: { section_id: 'saved', q: 'Тест & ремонт' } }, now);
  const next = writeEventSearch(url, state);
  assert.equal(next.get('month'), '2026-10');
  assert.equal(next.get('view'), 'days');
  assert.equal(next.get('direction'), 'asc');
  assert.equal(next.get('event'), 'opened');
  assert.equal(next.get('q'), 'Тест & ремонт');
  assert.deepEqual(readEventSearch(next, {}, now), state);
});
test('URL filters override local preferences, including absent filters and back/forward navigation', () => {
  const defaults = { view: 'calendar', filters: { section_id: 'saved', q: 'stale' } };
  const first = new URLSearchParams('view=days&month=2026-09&direction=desc&project_id=none&importance=critical');
  const state = readEventSearch(first, defaults, now);
  assert.equal(state.filters.section_id, '');
  assert.equal(state.filters.q, '');
  assert.equal(state.filters.project_id, 'none');
  assert.equal(state.view, 'days');
  assert.equal(state.monthKey, '2026-09');
  assert.equal(state.descending, true);
  const next = writeEventSearch(first, { ...state, filters: { ...state.filters, q: 'новый', type_id: 'type', created_by: 'author', requester_id: 'person', category_id: 'category', section_id: 'section' } });
  assert.equal(readEventSearch(next, defaults, now).filters.created_by, 'author');
  assert.deepEqual(readEventSearch(first, defaults, now), state);
  const reset = writeEventSearch(next, { ...state, filters: defaultStructureFilters() });
  assert.equal(reset.has('q'), false);
  assert.equal(reset.has('created_by'), false);
  assert.deepEqual(readEventSearch(reset, defaults, now).filters, defaultStructureFilters());
});
test('invalid months and views fall back without producing invalid calendar dates', () => {
  for (const month of ['2026-13', '2026-00', 'abc', '0000-01', '2026-10-26']) {
    const state = readEventSearch(new URLSearchParams({ month, view: 'unknown', direction: 'unknown' }), {}, now);
    assert.equal(state.monthKey, '2026-10');
    assert.equal(state.view, 'flow');
    assert.equal(state.descending, false);
  }
  assert.equal(readEventSearch(new URLSearchParams('month=2024-02'), {}, now).monthKey, '2024-02');
  assert.equal(eventMonthKey(new Date(2026, 0, 1)), '2026-01');
});
