import { apiRequest } from '../../api';

export const kpiApi = {
    async list(scopeId, includeInactive = false) { return (await apiRequest(`/scopes/${scopeId}/kpis${includeInactive ? '?include_inactive=1' : ''}`)).data; },
    async create(scopeId, payload) { return (await apiRequest(`/scopes/${scopeId}/kpis`, { method: 'POST', body: JSON.stringify(payload) })).data; },
    async update(scopeId, kpiId, payload) { return (await apiRequest(`/scopes/${scopeId}/kpis/${kpiId}`, { method: 'PATCH', body: JSON.stringify(payload) })).data; },
    remove(scopeId, kpiId) { return apiRequest(`/scopes/${scopeId}/kpis/${kpiId}`, { method: 'DELETE' }); },
    async stats(scopeId, month) { return (await apiRequest(`/scopes/${scopeId}/kpis/stats?month=${month}`)).data; },
    async settings(scopeId) { return (await apiRequest(`/scopes/${scopeId}/kpis/settings`)).data; },
    async updateSettings(scopeId, payload) { return (await apiRequest(`/scopes/${scopeId}/kpis/settings`, { method: 'PUT', body: JSON.stringify(payload) })).data; },
};
