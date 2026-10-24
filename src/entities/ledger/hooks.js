import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useLedgerRefresh(scopeId) {
  const client = useQueryClient();
  return useCallback(() => {
    for (const prefix of ['ledger-options', 'ledger-accounts', 'ledger-transactions', 'ledger-transaction', 'ledger-history', 'exploiter-expenses', 'exploiter', 'exploiter-entry', 'equip-history']) client.invalidateQueries({ queryKey: [prefix, scopeId] });
  }, [client, scopeId]);
}
