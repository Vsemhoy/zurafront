import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPlanOverdue, isPlanTaskOverdue } from './overdue.js';

const today = new Date(2026, 9, 7, 0, 5);

test('only unfinished plans from a past month are overdue', () => {
  assert.equal(isPlanOverdue({ month: '2026-09' }, today), true);
  assert.equal(isPlanOverdue({ month: '2026-09', completed_at: '2026-10-01' }, today), false);
  for (const month of ['2026-10', '2026-11', null, '']) {
    assert.equal(isPlanOverdue({ month }, today), false);
  }
});

test('plan becomes overdue on the first day of the next month, including a new year', () => {
  assert.equal(isPlanOverdue({ month: '2026-12' }, new Date(2026, 11, 31, 23, 59)), false);
  assert.equal(isPlanOverdue({ month: '2026-12' }, new Date(2027, 0, 1)), true);
});

test('unfinished tasks are overdue after their calendar day, not during it', () => {
  for (const status of ['todo', 'scheduled', 'in_progress', 'blocked', 'review']) {
    assert.equal(isPlanTaskOverdue({ status, due_at: '2026-10-06T12:00:00.000000Z' }, today), true);
  }
  for (const due_at of ['2026-10-07T00:00:00Z', '2026-10-08', null, '']) {
    assert.equal(isPlanTaskOverdue({ status: 'todo', due_at }, today), false);
  }
});

test('completed and deleted tasks are not overdue even inside an overdue plan', () => {
  for (const status of ['done', 'cancelled']) {
    assert.equal(isPlanTaskOverdue({ status, due_at: '2026-09-01' }, today), false);
  }
});
