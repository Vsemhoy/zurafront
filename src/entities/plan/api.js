import { apiRequest } from '../../api';

const base = (scopeId) => `/scopes/${scopeId}/plans`;
export const planApi = {
  async list(scopeId, filters) { return (await apiRequest(`${base(scopeId)}?${new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== ''))}`)).data; },
  async options(scopeId) { return (await apiRequest(`${base(scopeId)}/options`)).data; },
  candidates(scopeId, filters) { return apiRequest(`${base(scopeId)}/candidates?${new URLSearchParams(filters)}`); },
  async save(scopeId, id, payload) { return (await apiRequest(`${base(scopeId)}${id ? `/${id}` : ''}`, { method: id ? 'PATCH' : 'POST', body: JSON.stringify(payload) })).data; },
  remove(scopeId, id) { return apiRequest(`${base(scopeId)}/${id}`, { method: 'DELETE' }); },
};
