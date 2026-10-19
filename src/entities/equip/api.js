import { apiRequest } from '../../api';

const endpoint = (scopeId) => `/scopes/${scopeId}/equip`;
export const equipApi = {
  tasks: (scopeId, id, filters, signal) => apiRequest(`${endpoint(scopeId)}/${id}/tasks?${new URLSearchParams(filters)}`, { signal }),
  attachTask: (scopeId, id, taskId) => apiRequest(`${endpoint(scopeId)}/${id}/tasks`, { method: 'POST', body: JSON.stringify({ task_id: taskId }) }),
  detachTask: (scopeId, id, taskId) => apiRequest(`${endpoint(scopeId)}/${id}/tasks/${taskId}`, { method: 'DELETE' }),
  options: async (scopeId) => (await apiRequest(`${endpoint(scopeId)}/options`)).data,
  list: (scopeId, params, signal) => apiRequest(`${endpoint(scopeId)}?${params}`, { signal }),
  get: async (scopeId, id) => (await apiRequest(`${endpoint(scopeId)}/${id}`)).data,
  save: async (scopeId, id, payload) => (await apiRequest(`${endpoint(scopeId)}${id ? `/${id}` : ''}`, { method: id ? 'PATCH' : 'POST', body: JSON.stringify(payload) })).data,
  history: (scopeId, id, page) => apiRequest(`${endpoint(scopeId)}/${id}/history?page=${page}`),
  createType: async (scopeId, payload) => (await apiRequest(`${endpoint(scopeId)}/types`, { method: 'POST', body: JSON.stringify(payload) })).data,
  suppliers: async (scopeId, q, signal) => (await apiRequest(`${endpoint(scopeId)}/suppliers?q=${encodeURIComponent(q)}`, { signal })).data,
  createSupplier: async (scopeId, name) => (await apiRequest(`${endpoint(scopeId)}/suppliers`, { method: 'POST', body: JSON.stringify({ name }) })).data,
  operations: async (scopeId, id) => (await apiRequest(`${endpoint(scopeId)}/${id}/operations`)).data,
  operate: async (scopeId, id, payload) => (await apiRequest(`${endpoint(scopeId)}/${id}/operations`, { method: 'POST', body: JSON.stringify(payload) })).data,
  periods: (scopeId, id, kind, page) => apiRequest(`${endpoint(scopeId)}/${id}/${kind}?page=${page}`),
};
