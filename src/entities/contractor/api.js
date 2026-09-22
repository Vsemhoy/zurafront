import { apiRequest } from '../../api';

export const contractorApi = {
  async list(scopeId) { return (await apiRequest(`/scopes/${scopeId}/contractors`)).data; },
  async options(scopeId) { return (await apiRequest(`/scopes/${scopeId}/contractors/options`)).data; },
  async assignable(scopeId) { return (await apiRequest(`/scopes/${scopeId}/contractors/assignable`)).data; },
  async create(scopeId, payload) { return (await apiRequest(`/scopes/${scopeId}/contractors`, { method: 'POST', body: JSON.stringify(payload) })).data; },
  async update(scopeId, contractorId, payload) { return (await apiRequest(`/scopes/${scopeId}/contractors/${contractorId}`, { method: 'PATCH', body: JSON.stringify(payload) })).data; },
  async updateAccess(scopeId, contractorId, payload) { return (await apiRequest(`/scopes/${scopeId}/contractors/${contractorId}/access`, { method: 'PUT', body: JSON.stringify(payload) })).data; },
  async addScopes(scopeId, contractorId, scopeIds) { return (await apiRequest(`/scopes/${scopeId}/contractors/${contractorId}/scopes`, { method: 'POST', body: JSON.stringify({ scope_ids: scopeIds }) })).data; },
  async issueToken(scopeId, contractorId, payload) { return (await apiRequest(`/scopes/${scopeId}/contractors/${contractorId}/tokens`, { method: 'POST', body: JSON.stringify(payload) })).data; },
  async updateToken(scopeId, contractorId, tokenId, payload) { return (await apiRequest(`/scopes/${scopeId}/contractors/${contractorId}/tokens/${tokenId}`, { method: 'PATCH', body: JSON.stringify(payload) })).data; },
  revokeToken(scopeId, contractorId, tokenId) { return apiRequest(`/scopes/${scopeId}/contractors/${contractorId}/tokens/${tokenId}`, { method: 'DELETE' }); },
  activity(scopeId, contractorId, { cursor, tokenId, signal } = {}) {
    const params = new URLSearchParams({ limit: '30' });
    if (cursor) { params.set('cursor_at', cursor.at); params.set('cursor_id', cursor.id); }
    if (tokenId) params.set('token_id', tokenId);
    return apiRequest(`/scopes/${scopeId}/contractors/${contractorId}/activity?${params}`, { signal });
  },
  remove(scopeId, contractorId) { return apiRequest(`/scopes/${scopeId}/contractors/${contractorId}`, { method: 'DELETE' }); },
  startActing(scopeId, contractorId) { return apiRequest(`/scopes/${scopeId}/contractors/${contractorId}/act`, { method: 'POST', body: '{}' }); },
  stopActing() { return apiRequest('/contractors/acting', { method: 'DELETE' }); },
};
