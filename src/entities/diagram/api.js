import { apiRequest } from '../../api';

const base = (scopeId) => `/scopes/${scopeId}/diagrams`;
const json = (method, body) => ({ method, body: JSON.stringify(body) });
export const diagramApi = {
  list: (scopeId, filters = {}, signal) => apiRequest(`${base(scopeId)}?${new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== '' && value != null))}`, { signal }),
  async options(scopeId) { return (await apiRequest(`${base(scopeId)}/options`)).data; },
  async get(scopeId, id, signal) { return (await apiRequest(`${base(scopeId)}/${id}`, { signal })).data; },
  async save(scopeId, id, payload) { return (await apiRequest(`${base(scopeId)}${id ? `/${id}` : ''}`, { ...json(id ? 'PATCH' : 'POST', payload), signal: AbortSignal.timeout(30000) })).data; },
  async duplicate(scopeId, id, title) { return (await apiRequest(`${base(scopeId)}/${id}/duplicate`, json('POST', { title }))).data; },
  remove: (scopeId, id) => apiRequest(`${base(scopeId)}/${id}`, { method: 'DELETE' }),
  async revisions(scopeId, id) { return (await apiRequest(`${base(scopeId)}/${id}/revisions`)).data; },
  async revision(scopeId, id, revisionId) { return (await apiRequest(`${base(scopeId)}/${id}/revisions/${revisionId}`)).data; },
  async targets(scopeId, type, q, signal) { return (await apiRequest(`${base(scopeId)}/targets?${new URLSearchParams({ type, q })}`, { signal })).data; },
  async attach(scopeId, id, type, subjectId) { return (await apiRequest(`${base(scopeId)}/${id}/attachments`, json('POST', { subject_type: type, subject_id: subjectId }))).data; },
  detach: (scopeId, id, attachmentId) => apiRequest(`${base(scopeId)}/${id}/attachments/${attachmentId}`, { method: 'DELETE' }),
};
