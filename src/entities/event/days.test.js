import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventDayKey, eventDays, loadEventView } from './days.js';

test('day stream includes every day, leap day and empty dates without adjacent months', () => {
  const days = eventDays(new Date(2024, 1, 15), []);
  assert.equal(days.length, 29);
  assert.equal(days[0].key, '2024-02-01');
  assert.equal(days.at(-1).key, '2024-02-29');
  assert.equal(days[2].weekend, true);
  assert.deepEqual(days[0].events, []);
  assert.equal(eventDays(new Date(2025, 1, 1), [], true)[0].key, '2025-02-28');
});

test('occurrences group by displayed date; pins and time sort without mutating the input', () => {
  const events = [{ id: 'late', occurred_at: '2026-10-10T12:00:00' }, { id: 'pin', occurred_at: '2026-10-10T18:00:00', is_pinned: true },
    { id: 'early', occurrence_start: '2026-10-10T08:00:00', occurred_at: '2026-01-01' }, { id: 'invalid', occurred_at: 'bad' }];
  const days = eventDays(new Date(2026, 9, 1), events);
  assert.deepEqual(days[9].events.map((event) => event.id), ['pin', 'early', 'late']);
  assert.equal(events[0].id, 'late');
  assert.equal(eventDayKey('bad'), null);
});

test('view preference is user/scope-specific, validates stored values and tolerates unavailable storage', () => {
  const values = new Map([['alice:home:view', 'days'], ['bob:work:view', 'bad']]);
  const storage = { getItem: (key) => values.get(key) };
  assert.equal(loadEventView('alice:home', storage), 'days');
  assert.equal(loadEventView('bob:work', storage), 'flow');
  assert.equal(loadEventView('alice:work', { getItem: () => { throw Error('Disabled'); } }), 'flow');
});
