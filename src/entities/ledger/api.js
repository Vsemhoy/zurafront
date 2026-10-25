import { apiRequest } from '../../api';

const base = (scopeId) => `/scopes/${scopeId}/ledger`;
const save = async (scopeId, collection, id, payload) => (await apiRequest(`${base(scopeId)}/${collection}${id ? `/${id}` : ''}`, { method: id ? 'PATCH' : 'POST', body: JSON.stringify(payload) })).data;
export const ledgerApi = {
  flow: async (scopeId, params, signal) => (await apiRequest(`${base(scopeId)}/flow?${new URLSearchParams(params)}`, { signal })).data,
  report: async (scopeId, params, signal) => (await apiRequest(`${base(scopeId)}/report?${new URLSearchParams(params)}`, { signal })).data,
  move: async (scopeId, id, payload) => (await apiRequest(`${base(scopeId)}/transactions/${id}/move`, { method: 'POST', body: JSON.stringify(payload) })).data,
  options: async (scopeId) => (await apiRequest(`${base(scopeId)}/options`)).data,
  accounts: (scopeId, params, signal) => apiRequest(`${base(scopeId)}/accounts?${new URLSearchParams(params)}`, { signal }),
  statement: async (scopeId, id, month, signal) => (await apiRequest(`${base(scopeId)}/accounts/${id}/statement?${new URLSearchParams({ month })}`, { signal })).data,
  transactions: (scopeId, params, signal) => apiRequest(`${base(scopeId)}/transactions?${new URLSearchParams(params)}`, { signal }),
  transaction: async (scopeId, id) => (await apiRequest(`${base(scopeId)}/transactions/${id}`)).data,
  saveAccount: (scopeId, id, payload) => save(scopeId, 'accounts', id, payload),
  saveCategory: (scopeId, id, payload) => save(scopeId, 'categories', id, payload),
  saveTransaction: (scopeId, id, payload) => save(scopeId, 'transactions', id, payload),
  remove: (scopeId, id, revision) => apiRequest(`${base(scopeId)}/transactions/${id}`, { method: 'DELETE', body: JSON.stringify({ revision }) }),
  restore: async (scopeId, id, revision) => (await apiRequest(`${base(scopeId)}/transactions/${id}/restore`, { method: 'POST', body: JSON.stringify({ revision }) })).data,
  history: (scopeId, id, page) => apiRequest(`${base(scopeId)}/transactions/${id}/history?page=${page}`),
  linkExploitation: async (scopeId, entryId, payload) => (await apiRequest(`${base(scopeId)}/exploitation/${entryId}`, { method: 'POST', body: JSON.stringify(payload) })).data,
};
