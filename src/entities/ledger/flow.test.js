import test from 'node:test';
import assert from 'node:assert/strict';
import { canMoveLedgerCard, flowSlots, ledgerDays, ledgerFlowMonthTotals, ledgerMonthGroups, ledgerPeriodFilters, ledgerPeriodQuery, ledgerSelectedAccountIds, reportSeries, shiftLedgerMonth, shiftLedgerPeriod, summarizeLedgerReport } from './flow.js';
import { ledgerForm, ledgerPayload, newAccount } from './model.js';

test('flow spans calendar months including leap days without timezone shifts', () => {
  assert.equal(ledgerDays('2024-02', '2024-03').length, 60);
  assert.equal(ledgerDays('2024-02', '2024-03')[28], '2024-02-29');
  assert.deepEqual(ledgerDays('2026-13', '2026-13'), []);
  assert.deepEqual(ledgerDays('2026-10', '2026-09'), []);
  assert.equal(shiftLedgerMonth('2026-01', -1), '2025-12');
});
test('month groups and their days follow the selected direction, including leap February', () => {
  const descending = ledgerMonthGroups('2024-02', '2024-03');
  assert.deepEqual(descending.map(({ month }) => month), ['2024-03', '2024-02']);
  assert.equal(descending[0].dates[0], '2024-03-31');
  assert.equal(descending[1].dates[0], '2024-02-29');
  assert.equal(descending[1].dates.at(-1), '2024-02-01');
  const ascending = ledgerMonthGroups('2024-02', '2024-03', false);
  assert.deepEqual(ascending.map(({ month }) => month), ['2024-02', '2024-03']);
  assert.equal(ascending[0].dates[0], '2024-02-01');
  assert.equal(ascending[1].dates.at(-1), '2024-03-31');
});
test('period navigation shifts both bounds across a year and direction stays out of API filters', () => {
  assert.deepEqual(shiftLedgerPeriod('2025-12', '2026-02', 1), { start: '2026-01', end: '2026-03' });
  assert.deepEqual(shiftLedgerPeriod('2026-01', '2026-03', -1), { start: '2025-12', end: '2026-02' });
  assert.deepEqual(ledgerPeriodFilters(new URLSearchParams('start=2026-01&end=2026-03&direction=desc&account_id=a')), { start: '2026-01', end: '2026-03', account_id: 'a' });
});

test('flow account selection round trips multiple IDs and serializes PHP arrays without a stale single filter', () => {
  const params = new URLSearchParams('start=2026-10&end=2026-10&account_id=old&account_ids=a&account_ids=b&account_ids=a&direction=asc');
  assert.deepEqual(ledgerSelectedAccountIds(params), ['a', 'b']);
  const query = new URLSearchParams(ledgerPeriodQuery(ledgerPeriodFilters(params)));
  assert.deepEqual(query.getAll('account_ids[]'), ['a', 'b']);
  assert.equal(query.has('account_id'), false);
  assert.equal(query.has('direction'), false);
  assert.deepEqual(ledgerSelectedAccountIds(new URLSearchParams('account_id=old')), ['old']);
  assert.deepEqual(ledgerSelectedAccountIds(new URLSearchParams()), []);
  assert.equal(ledgerPeriodFilters(params, true).account_id, 'old');
  assert.equal(ledgerPeriodFilters(params, true).account_ids, undefined);
});
test('flow month totals keep accounts separate, count only posted past movements, and use daily closing balances', () => {
  const accounts = [{ id: 'a', currency: 'RUB', exclude_from_reports: true }, { id: 'b', currency: 'RUB' }, { id: 'usd', currency: 'USD' }];
  const tx = (kind, amount, extra = {}) => ({ kind, amount_minor: amount, account_id: 'a', occurred_on: '2026-10-02', status: 'posted', ...extra });
  const transactions = [tx('income', '9007199254740993'), tx('income', '7'), tx('expense', '100'), tx('transfer', '25', { target_account_id: 'b' }), tx('transfer', '5', { account_id: null, target_account_id: 'a' }), tx('adjustment_out', '8'), tx('income', '99', { status: 'planned' }), tx('expense', '99', { status: 'void' }), tx('income', '99', { occurred_on: '2026-10-30' }), tx('income', '99', { occurred_on: '2026-09-30' }), tx('income', '50', { account_id: 'usd' })];
  const daily = { a: [
    { date: '2026-10-02', opening_minor: '100', closing_minor: '200', interest_minor: '-2' },
    { date: '2026-10-01', opening_minor: '80', closing_minor: '100', interest_minor: '-1' },
    { date: '2026-09-30', opening_minor: '0', closing_minor: '80', interest_minor: '-99' },
  ] };
  const totals = ledgerFlowMonthTotals('2026-10', accounts, transactions, daily, '2026-10-26');
  assert.equal(totals.get('a').income, '9007199254741000');
  assert.equal(totals.get('a').expense, '100');
  assert.equal(totals.get('a').net, '9007199254740900');
  assert.equal(totals.get('a').transfers, '-20');
  assert.equal(totals.get('a').adjustments, '-8');
  assert.equal(totals.get('a').interest, '-3');
  assert.equal(totals.get('a').opening_minor, '80');
  assert.equal(totals.get('a').closing_minor, '200');
  assert.equal(totals.get('a').balance_date, '2026-10-02');
  assert.equal(totals.get('b').received, '25');
  assert.equal(totals.get('b').closing_minor, null);
  assert.equal(totals.get('usd').income, '50');
  const future = ledgerFlowMonthTotals('2026-11', accounts, transactions, daily, '2026-10-26').get('a');
  assert.equal(future.closing_minor, null);
  assert.equal(future.income, '0');
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
