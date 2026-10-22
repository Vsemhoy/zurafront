import { apiRequest } from '../../api';
export const scopeApi = {
    async updateModules(scopeId, payload) { return (await apiRequest(`/scopes/${scopeId}/modules`, { method: 'PATCH', body: JSON.stringify(payload) })).data; },
    async list() { return (await apiRequest('/scopes')).data; },
    async create(payload) { return (await apiRequest('/scopes', { method: 'POST', body: JSON.stringify(payload) })).data; },
    async updateAppearance(scopeId, headerTheme) { return (await apiRequest(`/scopes/${scopeId}/appearance`, { method: 'PATCH', body: JSON.stringify({ header_theme: headerTheme }) })).data; },
};
