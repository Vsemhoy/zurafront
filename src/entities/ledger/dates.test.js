import test from 'node:test';
import assert from 'node:assert/strict';
import { displayLedgerDate, displayLedgerMonth, ledgerDate } from './dates.js';
import { exploitationExpensePayload, ledgerForm, ledgerPayload, newExploitationExpense, newTransaction } from './model.js';

test('calendar days and legacy API timestamps display the same date and month', () => {
  for (const value of ['2026-10-25', '2026-10-25T00:00:00.000000Z', '2026-10-25T00:00:00Z']) {
    assert.equal(ledgerDate(value), '2026-10-25');
    assert.equal(displayLedgerDate(value), '25.10.2026');
    assert.equal(displayLedgerMonth(value), 'октябрь 2026 г.');
  }
});

test('invalid or absent calendar dates never roll over into another month or render Invalid Date', () => {
  for (const value of ['', null, undefined, 0, {}, 'Invalid Date', '2026-02-29', '2026-04-31', '2026-13-01', '2026-10-25garbage', '2026-10-25T99:99:99Z']) {
    assert.equal(ledgerDate(value), '');
    assert.equal(displayLedgerDate(value), '—');
    assert.equal(displayLedgerMonth(value), 'Без даты');
  }
  assert.equal(displayLedgerDate('2024-02-29T00:00:00.000000Z'), '29.02.2024');
});

test('calendar date rendering does not shift days or months with browser timezone', () => {
  const previous = process.env.TZ;
  try {
    for (const timezone of ['UTC', 'Europe/Moscow', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
      process.env.TZ = timezone;
      assert.equal(displayLedgerDate('2026-01-01T00:00:00.000000Z'), '01.01.2026');
      assert.equal(displayLedgerMonth('2026-01-01'), 'январь 2026 г.');
    }
  } finally {
    if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous;
  }
});

test('opening and saving a legacy transaction keeps its day without a phantom date change', () => {
  const legacy = { ...newTransaction(), id: 'tx', revision: 2, occurred_on: '2026-10-25T00:00:00.000000Z', title: 'Old', amount: '12.00' };
  const form = ledgerForm('transaction', legacy);
  assert.equal(form.occurred_on, '2026-10-25');
  assert.deepEqual(ledgerPayload('transaction', { ...form, title: 'New' }, legacy), { title: 'New', revision: 2 });
  assert.deepEqual(ledgerPayload('transaction', { ...form, occurred_on: '2026-11-01' }, form), { occurred_on: '2026-11-01', revision: 2 });
});

test('new exploitation payments use calendar dates even if the source is from an older response', () => {
  const draft = newExploitationExpense({ occurred_on: '2026-10-25T00:00:00.000000Z' });
  assert.equal(draft.occurred_on, '2026-10-25');
  assert.equal(exploitationExpensePayload({ ...draft, amount: '1.00' }, 1).occurred_on, '2026-10-25');
});
