import { apiRequest } from '../../api';

const base = (scopeId) => `/scopes/${scopeId}/darklogs`;
const body = (method, payload) => ({ method, body: JSON.stringify(payload) });
export const darklogApi = {
  async list(scopeId, filters) { return (await apiRequest(`${base(scopeId)}?${new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== '' && value != null))}`)).data; },
  async options(scopeId) { return (await apiRequest(`${base(scopeId)}/options`)).data; },
  async get(scopeId, id) { return (await apiRequest(`${base(scopeId)}/${id}`)).data; },
  async save(scopeId, id, payload) { return (await apiRequest(`${base(scopeId)}${id ? `/${id}` : ''}`, body(id ? 'PATCH' : 'POST', payload))).data; },
  remove(scopeId, id) { return apiRequest(`${base(scopeId)}/${id}`, { method: 'DELETE' }); },
  async candidates(scopeId, type, q) { return (await apiRequest(`${base(scopeId)}/candidates?${new URLSearchParams({ type, q })}`)).data; },
  async link(scopeId, id, payload) { return (await apiRequest(`${base(scopeId)}/${id}/links`, body('POST', payload))).data; },
  unlink(scopeId, id, linkId) { return apiRequest(`${base(scopeId)}/${id}/links/${linkId}`, { method: 'DELETE' }); },
  async comment(scopeId, id, payload) { return (await apiRequest(`${base(scopeId)}/${id}/comments`, body('POST', payload))).data; },
  deleteComment(scopeId, id, commentId) { return apiRequest(`${base(scopeId)}/${id}/comments/${commentId}`, { method: 'DELETE' }); },
  async kpi(scopeId, id, payload) { return (await apiRequest(`${base(scopeId)}/${id}/kpi`, body('POST', payload))).data; },
  deleteKpi(scopeId, id, allocationId) { return apiRequest(`${base(scopeId)}/${id}/kpi/${allocationId}`, { method: 'DELETE' }); },
};
