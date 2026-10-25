import test from 'node:test';
import assert from 'node:assert/strict';
import { ledgerForm, ledgerPayload, moneyTotals, newAccount, rateToBasisPoints } from './model.js';

test('credit rates are exact integer basis points and accept decimal comma', () => {
  assert.equal(rateToBasisPoints('23.50'), 2350);
  assert.equal(rateToBasisPoints('0,01'), 1);
  assert.equal(rateToBasisPoints('0'), 0);
  assert.equal(rateToBasisPoints(''), null);
  for (const invalid of ['-1', '1000.01', '1.001', 'NaN', '1e2']) assert.throws(() => rateToBasisPoints(invalid));
});

test('credit account round trips explicit terms and sends only actual changes', () => {
  const original = ledgerForm('account', { ...newAccount('p'), id: 'credit', revision: 3, type: 'credit', interest_rate_bps: 2350, interest_start_on: '2026-01-01', interest_end_on: null });
  assert.equal(original.interest_rate, '23.50');
  assert.equal(original.interest_end_on, '');
  assert.deepEqual(ledgerPayload('account', { ...original, title: 'New name' }, original), { title: 'New name', revision: 3 });
  assert.deepEqual(ledgerPayload('account', { ...original, interest_rate: '24,25' }, original), { interest_rate_bps: 2425, revision: 3 });
  assert.deepEqual(ledgerPayload('account', { ...original, interest_rate: '23.5' }, original), { revision: 3 });
});

test('new credit payload preserves zero rate and clearing a prior date is explicit', () => {
  const draft = { ...newAccount('p'), type: 'credit', interest_rate: '0', interest_start_on: '2026-01-01' };
  const payload = ledgerPayload('account', draft);
  assert.equal(payload.interest_rate_bps, 0);
  assert.equal(payload.interest_start_on, '2026-01-01');
  assert.equal(payload.interest_end_on, null);
  assert.equal('interest_rate' in payload, false);
  const original = { ...draft, id: 'credit', revision: 2, interest_end_on: '2026-12-31' };
  assert.deepEqual(ledgerPayload('account', { ...original, interest_end_on: '' }, original), { interest_end_on: null, revision: 2 });
});

test('visible totals prefer current balances including interest and never future book balances', () => {
  assert.deepEqual(moneyTotals([{ currency: 'RUB', balance_minor: '90000', balance_today_minor: '-10303' }, { currency: 'RUB', balance_minor: '100', balance_today_minor: '0' }]), [{ currency: 'RUB', minor: '-10303' }]);
});
