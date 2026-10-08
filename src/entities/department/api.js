import { apiRequest } from '../../api';
export const departmentApi = {
  async list(scopeId) { return (await apiRequest(`/scopes/${scopeId}/departments`)).data; },
  async save(scopeId, id, payload) { return (await apiRequest(`/scopes/${scopeId}/departments${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) })).data; },
  remove(scopeId, id) { return apiRequest(`/scopes/${scopeId}/departments/${id}`, { method: 'DELETE' }); },
  claim(scopeId, id) { return apiRequest(`/scopes/${scopeId}/tasks/${id}/claim`, { method: 'POST', body: '{}' }); },
};
