import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth';
import { ledgerAccountStorageKey, rememberLedgerAccounts, restoreLedgerAccounts } from './preferences';

export function useLedgerAccountParams(scopeId) {
  const userId = useAuth((state) => state.user?.id);
  const [urlParams, setParams] = useSearchParams();
  const key = ledgerAccountStorageKey(userId, scopeId, urlParams);
  const [restoredFor, setRestoredFor] = useState(null);
  let params = urlParams;
  if (restoredFor !== key) {
    try { params = restoreLedgerAccounts(urlParams, window.localStorage, key); } catch { /* Storage may be disabled. */ }
  }
  const search = params.toString();
  useEffect(() => {
    if (restoredFor !== key) {
      // Tracks completion of the one-time synchronization between this storage key and the URL.
      // oxlint-disable-next-line react/set-state-in-effect
      setRestoredFor(key);
      if (urlParams.toString() !== search) setParams(new URLSearchParams(search), { replace: true });
      return;
    }
    try { rememberLedgerAccounts(urlParams, window.localStorage, key); } catch { /* Storage may be disabled. */ }
  }, [key, restoredFor, search, urlParams, setParams]);
  return [params, setParams];
}
