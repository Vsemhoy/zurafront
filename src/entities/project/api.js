import { apiRequest } from '../../api';

export const projectApi = {
    async list(scopeId) { return (await apiRequest(`/scopes/${scopeId}/projects`)).data; },
    async create(scopeId, payload) { return (await apiRequest(`/scopes/${scopeId}/projects`, { method: 'POST', body: JSON.stringify(payload) })).data; },
    async update(scopeId, projectId, payload) { return (await apiRequest(`/scopes/${scopeId}/projects/${projectId}`, { method: 'PATCH', body: JSON.stringify(payload) })).data; },
};
