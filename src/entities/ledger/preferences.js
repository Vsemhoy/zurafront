export function ledgerAccountStorageKey(userId, scopeId, params, view = params.get('view')) {
  const mode = view === 'flow' ? 'flow' : view === 'report' ? 'report' : 'journal';
  return `zuratax:ledger:accounts:${userId}:${scopeId}:${params.get('project_id') || 'all'}:${mode}`;
}

export function restoreLedgerAccounts(params, storage, key) {
  if (params.has('account_id') || params.has('account_ids')) return params;
  try {
    const saved = JSON.parse(storage.getItem(key));
    if (!saved || !['account_id', 'account_ids'].includes(saved.field) || !Array.isArray(saved.ids)
      || saved.ids.some((id) => typeof id !== 'string' || !/^[0-9a-z]{26}$/i.test(id))) return params;
    const next = new URLSearchParams(params);
    for (const id of saved.ids.length ? [...new Set(saved.ids)] : ['']) next.append(saved.field, id);
    return next;
  } catch { return params; }
}

export function rememberLedgerAccounts(params, storage, key, view = params.get('view')) {
  const field = view === 'flow' && params.has('account_ids') ? 'account_ids' : 'account_id';
  try { storage.setItem(key, JSON.stringify({ field, ids: params.getAll(field).filter(Boolean) })); } catch { /* Storage may be disabled. */ }
}
