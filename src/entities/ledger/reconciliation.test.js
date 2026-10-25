import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMoney, ledgerForm, ledgerPayload, moneyTotals, transactionSign } from './model.js';

test('unknown balances are not shown as zero or included in totals', () => {
  assert.equal(formatMoney(null, 'RUB'), 'Неизвестно');
  assert.deepEqual(moneyTotals([{ currency: 'RUB', balance_is_known: false, balance_minor: '999999' }, { currency: 'RUB', balance_today_minor: '300' }]), [{ currency: 'RUB', minor: '300' }]);
  assert.deepEqual(moneyTotals([{ currency: 'USD', balance_is_known: false, balance_minor: null }]), []);
});

test('confirming an unknown opening balance explicitly sends even a zero amount', () => {
  const original = ledgerForm('account', { id: 'a', revision: 4, opening_balance: '0.00', balance_is_known: false });
  assert.deepEqual(ledgerPayload('account', { ...original, balance_is_known: true }, original), { revision: 4, balance_is_known: true, opening_balance: '0.00' });
  assert.deepEqual(ledgerPayload('account', { ...original, title: 'Other' }, original), { revision: 4, title: 'Other' });
});

test('reconciliation entries have explicit signs and keep their reason and retry identity', () => {
  assert.equal(transactionSign({ kind: 'adjustment_in' }), '+');
  assert.equal(transactionSign({ kind: 'adjustment_out' }), '−');
  const draft = { kind: 'adjustment_out', amount: '12,30', note_md: 'Сверка с выпиской', idempotency_key: 'same-key', account_id: 'a' };
  const payload = ledgerPayload('transaction', draft);
  assert.equal(payload.kind, 'adjustment_out');
  assert.equal(payload.amount, '12.30');
  assert.equal(payload.note_md, 'Сверка с выпиской');
  assert.equal(payload.idempotency_key, 'same-key');
});
