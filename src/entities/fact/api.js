import { apiRequest } from '../../api';

export const factApi = {
  async list(scopeId) { return (await apiRequest(`/scopes/${scopeId}/facts`)).data; },
  async get(scopeId, factId) { return (await apiRequest(`/scopes/${scopeId}/facts/${factId}`)).data; },
  async create(scopeId, payload) { return (await apiRequest(`/scopes/${scopeId}/facts`, { method: 'POST', body: JSON.stringify(payload) })).data; },
  async update(scopeId, factId, payload) { return (await apiRequest(`/scopes/${scopeId}/facts/${factId}`, { method: 'PATCH', body: JSON.stringify(payload) })).data; },
};
