import { apiRequest } from '../../api';

export const kpiApi = {
    async list(scopeId, includeInactive = false, userId = null, month = null) { const query = new URLSearchParams(); if (includeInactive) query.set('include_inactive', '1'); if (userId) { query.set('user_id', userId); query.set('month', month || new Date().toISOString().slice(0, 7)); } return (await apiRequest(`/scopes/${scopeId}/kpis?${query}`)).data; },
    async profile(scopeId, userId, month) { return (await apiRequest(`/scopes/${scopeId}/kpi-profiles/${userId}?month=${month}`)).data; },
    async saveProfile(scopeId, userId, payload) { return (await apiRequest(`/scopes/${scopeId}/kpi-profiles/${userId}`, { method: 'PUT', body: JSON.stringify(payload) })).data; },
    async create(scopeId, payload) { return (await apiRequest(`/scopes/${scopeId}/kpis`, { method: 'POST', body: JSON.stringify(payload) })).data; },
    async update(scopeId, kpiId, payload) { return (await apiRequest(`/scopes/${scopeId}/kpis/${kpiId}`, { method: 'PATCH', body: JSON.stringify(payload) })).data; },
    remove(scopeId, kpiId) { return apiRequest(`/scopes/${scopeId}/kpis/${kpiId}`, { method: 'DELETE' }); },
    async stats(scopeId, month, userId = null, completion = 'completed') { const query = new URLSearchParams({ month, completion }); if (userId) query.set('user_id', userId); return (await apiRequest(`/scopes/${scopeId}/kpis/stats?${query}`)).data; },
    async settings(scopeId) { return (await apiRequest(`/scopes/${scopeId}/kpis/settings`)).data; },
    async updateSettings(scopeId, payload) { return (await apiRequest(`/scopes/${scopeId}/kpis/settings`, { method: 'PUT', body: JSON.stringify(payload) })).data; },
};
