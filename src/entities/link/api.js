import { apiRequest } from '../../api';

export const entityLinkApi = {
  async list(scopeId, subjectType, subjectId) { const query = new URLSearchParams({ subject_type: subjectType, subject_id: subjectId }); return (await apiRequest(`/scopes/${scopeId}/links?${query}`)).data; },
  async create(scopeId, payload) { return (await apiRequest(`/scopes/${scopeId}/links`, { method: 'POST', body: JSON.stringify(payload) })).data; },
  remove(scopeId, linkId) { return apiRequest(`/scopes/${scopeId}/links/${linkId}`, { method: 'DELETE' }); },
};
