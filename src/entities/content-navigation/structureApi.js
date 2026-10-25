import { apiRequest } from '../../api';

const path = (scopeId, module) => `/scopes/${scopeId}/content-structure/${module}`;
const json = (method, payload) => ({ method, body: JSON.stringify(payload) });
export const structureApi = {
  async catalog(scopeId, module) { return (await apiRequest(path(scopeId, module))).data; },
  async save(scopeId, module, kind, id, payload) {
    return (await apiRequest(`${path(scopeId, module)}/${kind}${id ? `/${id}` : ''}`, json(id ? 'PATCH' : 'POST', payload))).data;
  },
  remove(scopeId, module, kind, id, revision) { return apiRequest(`${path(scopeId, module)}/${kind}/${id}`, json('DELETE', { revision })); },
};
