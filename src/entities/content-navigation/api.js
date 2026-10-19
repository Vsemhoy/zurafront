import { apiRequest } from '../../api';
const base = (scopeId) => `/scopes/${scopeId}/content-nodes`;
const nodePath = (scopeId, node) => `${base(scopeId)}/${node.type}/${node.id}`;
export const contentNavigationApi = {
  async get(scopeId, node, signal) { return (await apiRequest(nodePath(scopeId, node), { signal })).data; },
  candidates(scopeId, filters, signal) { return apiRequest(`${base(scopeId)}/targets?${new URLSearchParams(filters)}`, { signal }); },
  async save(scopeId, node, payload, linkId) { return (await apiRequest(`${nodePath(scopeId, node)}/links${linkId ? '/' + linkId : ''}`, { method: linkId ? 'PATCH' : 'POST', body: JSON.stringify(payload) })).data; },
  remove(scopeId, node, id) { return apiRequest(`${nodePath(scopeId, node)}/links/${id}`, { method: 'DELETE' }); },
};
