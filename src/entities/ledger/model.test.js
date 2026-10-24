import test from 'node:test';
import assert from 'node:assert/strict';
import { exploitationExpensePayload, formatMoney, ledgerForm, ledgerPayload, minorToDecimal, moneyToMinor, moneyTotals, newAccount, newExploitationExpense, newTransaction, transactionSign } from './model.js';

test('money is parsed and summed as exact minor units, never binary floats', () => {
  assert.equal(moneyToMinor('0.10') + moneyToMinor('0.20'), 30n);
  assert.equal(moneyToMinor('1,25'), 125n);
  assert.equal(minorToDecimal(-105n), '-1.05');
  assert.equal(formatMoney('9007199254740993', 'RUB').replaceAll('\u00a0', ' '), '90 071 992 547 409,93 RUB');
  for (const invalid of ['1e3', 'NaN', '1.001', '10000000000', '']) assert.throws(() => moneyToMinor(invalid));
});
test('balances never mix currencies or lose precision at the JavaScript integer boundary', () => {
  assert.deepEqual(moneyTotals([{ currency: 'RUB', balance_minor: '9007199254740993' }, { currency: 'USD', balance_minor: '5' }, { currency: 'RUB', balance_minor: '1' }]), [{ currency: 'RUB', minor: '9007199254740994' }, { currency: 'USD', minor: '5' }]);
});
test('existing account edits cannot change project or currency and keep a revision', () => {
  const original = { ...newAccount('project-a'), id: 'account', revision: 4, title: 'Cash' };
  assert.deepEqual(ledgerPayload('account', { ...original, project_id: 'project-b', currency: 'USD', title: 'New' }, original), { title: 'New', revision: 4 });
});
test('partial transactions never resend account, author, amount or Markdown accidentally', () => {
  const original = ledgerForm('transaction', { id: 'transaction', revision: 3, kind: 'expense', account_id: 'a', title: 'Repair', amount: '12.30', status: 'planned', occurred_on: '2026-10-23', note_md: '# Keep me', is_pinned: false });
  assert.deepEqual(ledgerPayload('transaction', { ...original, status: 'posted', amount: '12.3' }, original), { status: 'posted', revision: 3 });
  assert.deepEqual(ledgerPayload('transaction', { ...original, note_md: '' }, original), { note_md: null, revision: 3 });
});
test('one transfer uses both accounts and a stable retry key, not two independent operations', () => {
  const form = { ...newTransaction({ id: 'source' }, 'transfer'), amount: '10', target_account_id: 'target', title: 'Move', category_id: 'ignored' };
  const payload = ledgerPayload('transaction', form);
  assert.equal(payload.amount, '10.00');
  assert.equal(payload.target_account_id, 'target');
  assert.equal(payload.category_id, null);
  assert.equal(payload.idempotency_key, ledgerPayload('transaction', form).idempotency_key);
});
test('transfer signs reflect the accessible side without inventing hidden account names', () => {
  assert.equal(transactionSign({ kind: 'transfer', account: null, target_account: { id: 'a' } }), '+');
  assert.equal(transactionSign({ kind: 'transfer', account: { id: 'a' }, target_account: null }), '−');
  assert.equal(transactionSign({ kind: 'transfer', account: { id: 'a' }, target_account: { id: 'b' }, target_account_id: 'b' }, 'b'), '+');
});

test('each exploitation payment has an independent amount and stable retry identity', () => {
  const entry = { occurred_on: '2026-10-23', part_cost: '100', labor_cost: '200' };
  const draft = newExploitationExpense(entry);
  assert.equal(draft.amount, '');
  const payload = exploitationExpensePayload({ ...draft, amount: '12,50', account_id: 'cash', cost_type: 'parts', title: ' Деталь ', note_md: 'Чек' }, 7);
  assert.equal(payload.amount, '12.50');
  assert.equal(payload.title, 'Деталь');
  assert.equal(payload.cost_type, 'parts');
  assert.equal(payload.entry_revision, 7);
  assert.equal(payload.idempotency_key, draft.idempotency_key);
  assert.notEqual(newExploitationExpense(entry).idempotency_key, draft.idempotency_key);
  assert.equal('title' in exploitationExpensePayload({ ...draft, amount: '1' }, 7), false);
});

test('linked payment editing changes only its own amount and cost type', () => {
  const original = ledgerForm('transaction', { id: 'payment', revision: 3, has_exploitation: true, cost_type: 'parts', amount: '10.00', title: 'Old' });
  assert.deepEqual(ledgerPayload('transaction', { ...original, amount: '20', cost_type: 'labor' }, original), { amount: '20.00', cost_type: 'labor', revision: 3 });
  assert.equal('cost_type' in ledgerPayload('transaction', { ...original, has_exploitation: false, cost_type: 'labor' }, { ...original, has_exploitation: false }), false);
});
