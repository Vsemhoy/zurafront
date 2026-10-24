import { apiRequest } from '../../api';

export const factApi = {
  page(scopeId, filters = {}) { const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== '' && value != null)); return apiRequest(`/scopes/${scopeId}/facts?${query}`); },
  async list(scopeId) { return (await this.page(scopeId, { per_page: 100 })).data; },
  async options(scopeId) { return (await apiRequest(`/scopes/${scopeId}/facts/options`)).data; },
  async get(scopeId, factId) { return (await apiRequest(`/scopes/${scopeId}/facts/${factId}`)).data; },
  async create(scopeId, payload) { return (await apiRequest(`/scopes/${scopeId}/facts`, { method: 'POST', body: JSON.stringify(payload) })).data; },
  async update(scopeId, factId, payload) { return (await apiRequest(`/scopes/${scopeId}/facts/${factId}`, { method: 'PATCH', body: JSON.stringify(payload) })).data; },
  async save(scopeId, id, payload) { return id ? this.update(scopeId, id, payload) : this.create(scopeId, payload); },
  async reveal(scopeId, id) { return (await apiRequest(`/scopes/${scopeId}/facts/${id}/reveal`, { method: 'POST', body: '{}', cache: 'no-store' })).data; },
  remove(scopeId, id, revision) { return apiRequest(`/scopes/${scopeId}/facts/${id}`, { method: 'DELETE', body: JSON.stringify({ revision }) }); },
  async restore(scopeId, id, revision) { return (await apiRequest(`/scopes/${scopeId}/facts/${id}/restore`, { method: 'POST', body: JSON.stringify({ revision }) })).data; },
};
