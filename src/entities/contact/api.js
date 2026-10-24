import { apiRequest } from '../../api';

export const contactApi = {
  page(scopeId, filters = {}) { const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== '' && value != null)); return apiRequest(`/scopes/${scopeId}/contacts?${query}`); },
  async get(scopeId, id) { return (await apiRequest(`/scopes/${scopeId}/contacts/${id}`)).data; },
  async options(scopeId) { return (await apiRequest(`/scopes/${scopeId}/contacts/options`)).data; },
  async save(scopeId, id, payload) { return (await apiRequest(`/scopes/${scopeId}/contacts${id ? `/${id}` : ''}`, { method: id ? 'PATCH' : 'POST', body: JSON.stringify(payload) })).data; },
  remove(scopeId, id, revision) { return apiRequest(`/scopes/${scopeId}/contacts/${id}`, { method: 'DELETE', body: JSON.stringify({ revision }) }); },
  async restore(scopeId, id, revision) { return (await apiRequest(`/scopes/${scopeId}/contacts/${id}/restore`, { method: 'POST', body: JSON.stringify({ revision }) })).data; },
  notes(scopeId, id, page = 1) { return apiRequest(`/scopes/${scopeId}/contacts/${id}/notes?page=${page}`); },
  async addNote(scopeId, id, payload) { return (await apiRequest(`/scopes/${scopeId}/contacts/${id}/notes`, { method: 'POST', body: JSON.stringify(payload) })).data; },
  removeNote(scopeId, id, noteId) { return apiRequest(`/scopes/${scopeId}/contacts/${id}/notes/${noteId}`, { method: 'DELETE' }); },
};
