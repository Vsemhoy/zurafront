import test from 'node:test';
import assert from 'node:assert/strict';
import { ledgerAccountStorageKey, rememberLedgerAccounts, restoreLedgerAccounts } from './preferences.js';
import { ledgerForm, ledgerPayload, newExploitationExpense, newTransaction } from './model.js';

const first = '01m49f6mth87q8tnz48wjnh7x4';
const second = '01m4c913wqfj5bvf6jrpczfc1c';
const storage = () => { const items = new Map(); return { getItem: (key) => items.get(key) ?? null, setItem: (key, value) => items.set(key, value) }; };
test('selected accounts and explicit all survive reopening; a shared URL takes precedence', () => {
  const store = storage();
  const saved = new URLSearchParams(`view=flow&account_ids=${first}&account_ids=${second}`);
  rememberLedgerAccounts(saved, store, 'scope');
  const reopened = restoreLedgerAccounts(new URLSearchParams('view=flow&start=2026-10'), store, 'scope');
  assert.deepEqual(reopened.getAll('account_ids'), [first, second]);
  assert.equal(reopened.get('start'), '2026-10');
  for (const query of [`account_id=${second}`, `account_ids=${second}`, 'account_ids=']) {
    const explicit = new URLSearchParams(query);
    assert.equal(restoreLedgerAccounts(explicit, store, 'scope'), explicit);
  }
  rememberLedgerAccounts(new URLSearchParams('view=flow&account_ids='), store, 'scope');
  assert.equal(restoreLedgerAccounts(new URLSearchParams('view=flow'), store, 'scope').get('account_ids'), '');
});
test('account preferences are isolated by user, scope, project and view; bad storage is ignored', () => {
  const params = new URLSearchParams('view=flow');
  const key = ledgerAccountStorageKey('user', 'scope', params);
  assert.notEqual(key, ledgerAccountStorageKey('other', 'scope', params));
  assert.notEqual(key, ledgerAccountStorageKey('user', 'other', params));
  assert.notEqual(key, ledgerAccountStorageKey('user', 'scope', new URLSearchParams('view=flow&project_id=project')));
  assert.notEqual(key, ledgerAccountStorageKey('user', 'scope', new URLSearchParams('view=report')));
  for (const value of ['broken', 'null', '{"field":"account_ids","ids":[8]}', '{"field":"q","ids":[]}']) {
    assert.equal(restoreLedgerAccounts(params, { getItem: () => value }, key), params);
  }
  const blocked = { getItem: () => { throw Error('disabled'); }, setItem: () => { throw Error('disabled'); } };
  assert.equal(restoreLedgerAccounts(params, blocked, key), params);
  assert.doesNotThrow(() => rememberLedgerAccounts(params, blocked, key));
});
test('new operations are posted; editing preserves status and sends only changed project allocation', () => {
  assert.equal(newTransaction().status, 'posted');
  assert.equal(newExploitationExpense({ occurred_on: '2026-10-26' }).status, 'posted');
  const existing = ledgerForm('transaction', { id: first, revision: 2, title: 'Hosting', amount: '5.00', occurred_on: '2026-10-26', status: 'planned', is_pinned: false, allocation_project_id: second });
  assert.equal(existing.status, 'planned');
  assert.deepEqual(ledgerPayload('transaction', { ...existing, allocation_project_id: '' }, existing), { allocation_project_id: null, revision: 2 });
  assert.deepEqual(ledgerPayload('transaction', { ...existing, title: 'Server' }, existing), { title: 'Server', revision: 2 });
});
