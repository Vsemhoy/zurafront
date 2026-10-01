import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventTypeOptions, recurrenceForm, recurrencePayload } from './recurrence.js';

test('no-type placeholder replaces legacy none type without losing current selection', () => {
  const types = [{ id: 'none-id', code: 'none', name: 'Без типа' }, { id: 'event-id', code: 'event', name: 'Событие' }];
  assert.deepEqual(eventTypeOptions(types, 'none-id'), { value: '', rows: [types[1]] });
  assert.equal(eventTypeOptions(types, 'event-id').value, 'event-id');
});

test('schedule form round-trips the instant and the recurrence timezone', () => {
  const form = recurrenceForm({ starts_at: '2026-10-01T06:30:00Z', recurrence_frequency: 'monthly', recurrence_timezone: 'Europe/Moscow', recurrence_until: '2026-12-31' });
  const payload = recurrencePayload(form);
  assert.equal(payload.starts_at, '2026-10-01T06:30:00.000Z');
  assert.equal(payload.recurrence_timezone, 'Europe/Moscow');
  assert.equal(payload.recurrence_until, '2026-12-31');
});

test('disabling repetition clears only repetition limits and employee binding', () => {
  const payload = recurrencePayload({ ...recurrenceForm(), recurrence_until: '2026-12-31', recurrence_user_id: 'person', is_all_day: true });
  assert.equal(payload.recurrence_frequency, null);
  assert.equal(payload.recurrence_until, null);
  assert.equal(payload.recurrence_user_id, null);
  assert.equal(payload.is_all_day, true);
});
