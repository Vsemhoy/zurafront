import { apiRequest } from '../../api';
export const scopeApi = {
    async list() { return (await apiRequest('/scopes')).data; },
    async create(payload) { return (await apiRequest('/scopes', { method: 'POST', body: JSON.stringify(payload) })).data; },
};
