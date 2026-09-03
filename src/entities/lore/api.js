import { apiRequest } from '../../api';

export const loreApi = {
  async list(scopeId, params = {}) { const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value != null)); return (await apiRequest(`/scopes/${scopeId}/lore?${query}`)).data; },
  async get(scopeId, id) { return (await apiRequest(`/scopes/${scopeId}/lore/${id}`)).data; },
  async create(scopeId, payload) { return (await apiRequest(`/scopes/${scopeId}/lore`, { method: 'POST', body: JSON.stringify(payload) })).data; },
  async revise(scopeId, id, payload) { return (await apiRequest(`/scopes/${scopeId}/lore/${id}/revisions`, { method: 'POST', body: JSON.stringify(payload) })).data; },
  async star(scopeId, id, starred) { return (await apiRequest(`/scopes/${scopeId}/lore/${id}/star`, { method: 'PATCH', body: JSON.stringify({ starred }) })).data; },
  async areas(scopeId) { return (await apiRequest(`/scopes/${scopeId}/lore/areas`)).data; },
};
