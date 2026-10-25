import test from 'node:test';
import assert from 'node:assert/strict';
import { canMoveLedgerCard, flowSlots, ledgerDays, reportSeries, shiftLedgerMonth, summarizeLedgerReport } from './flow.js';
import { ledgerForm, ledgerPayload, newAccount } from './model.js';

test('flow spans calendar months including leap days without timezone shifts', () => {
  assert.equal(ledgerDays('2024-02', '2024-03').length, 60);
  assert.equal(ledgerDays('2024-02', '2024-03')[28], '2024-02-29');
  assert.deepEqual(ledgerDays('2026-13', '2026-13'), []);
  assert.deepEqual(ledgerDays('2026-10', '2026-09'), []);
  assert.equal(shiftLedgerMonth('2026-01', -1), '2025-12');
});
test('a transfer appears in both visible account columns as one record with separate drag sides', () => {
  const transfer = { id: 'tx', kind: 'transfer', account_id: 'source', target_account_id: 'target', occurred_on: '2026-10-25' };
  const slots = flowSlots([transfer], [{ id: 'source' }, { id: 'target' }]);
  assert.equal(slots.get('2026-10-25:source')[0].side, 'source');
  assert.equal(slots.get('2026-10-25:target')[0].side, 'target');
  assert.equal(slots.get('2026-10-25:target')[0].transaction, transfer);
  const partial = flowSlots([{ ...transfer, account_id: null }], [{ id: 'target' }]);
  assert.equal(partial.size, 1);
  assert.equal(partial.has('2026-10-25:null'), false);
});
test('drag destinations respect permissions, currency, project and the other transfer side', () => {
  const source = { id: 'a', can_write: true, project_id: 'p', currency: 'RUB' };
  const destination = { ...source, id: 'b' };
  const tx = { kind: 'expense', can_write: true, account_id: 'a', currency: 'RUB' };
  assert.equal(canMoveLedgerCard(tx, 'source', destination, [source]), true);
  for (const change of [{ can_write: false }, { currency: 'USD' }, { project_id: 'hidden' }]) assert.equal(canMoveLedgerCard(tx, 'source', { ...destination, ...change }, [source]), false);
  assert.equal(canMoveLedgerCard({ ...tx, kind: 'transfer', target_account_id: 'b' }, 'source', destination, [source]), false);
  assert.equal(canMoveLedgerCard({ ...tx, kind: 'adjustment_in' }, 'source', destination, [source]), false);
  assert.equal(canMoveLedgerCard({ ...tx, kind: 'adjustment_in' }, 'source', { ...destination, can_manage: true }, [source]), true);
});
test('report totals exclude flagged accounts, separate currencies, retain exact integers and unknown balances', () => {
  const accounts = [{ id: 'a', currency: 'RUB' }, { id: 'hidden', currency: 'RUB', exclude_from_reports: true }, { id: 'usd', currency: 'USD' }, { id: 'unknown', currency: 'RUB' }];
  const rows = [{ account_id: 'a', currency: 'RUB', month: '2026-10', closing_minor: '9007199254740993', income: '10', sent: '15' }, { account_id: 'hidden', currency: 'RUB', month: '2026-10', closing_minor: '999', income: '999' }, { account_id: 'usd', currency: 'USD', month: '2026-10', closing_minor: '123' }, { account_id: 'unknown', currency: 'RUB', month: '2026-10', closing_minor: null, income: '20', received: '5' }];
  const [total] = summarizeLedgerReport(rows, accounts, 'RUB');
  assert.equal(total.closing_minor, '9007199254740993');
  assert.equal(total.income, '30');
  assert.equal(reportSeries([total])[0].transfers, '-10');
  assert.equal(summarizeLedgerReport(rows, [accounts[3]], 'RUB')[0].closing_minor, null);
  assert.equal(summarizeLedgerReport(rows, accounts, 'USD')[0].closing_minor, '123');
});
test('account exclusion is explicit in new accounts and a minimal versioned edit', () => {
  assert.equal(newAccount().exclude_from_reports, false);
  const account = ledgerForm('account', { id: 'a', revision: 3, title: 'Cash', opening_balance: '0.00', exclude_from_reports: false });
  assert.deepEqual(ledgerPayload('account', { ...account, exclude_from_reports: true }, account), { revision: 3, exclude_from_reports: true });
});
