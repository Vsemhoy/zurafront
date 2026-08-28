import { apiRequest } from '../../api';

export const eventApi = {
  async list(scopeId) { return (await apiRequest(`/scopes/${scopeId}/events`)).data; },
  async get(scopeId, eventId) { return (await apiRequest(`/scopes/${scopeId}/events/${eventId}`)).data; },
  async create(scopeId, payload) { return (await apiRequest(`/scopes/${scopeId}/events`, { method: 'POST', body: JSON.stringify(payload) })).data; },
  async update(scopeId, eventId, payload) { return (await apiRequest(`/scopes/${scopeId}/events/${eventId}`, { method: 'PATCH', body: JSON.stringify(payload) })).data; },
  async types(scopeId) { return (await apiRequest(`/scopes/${scopeId}/event-types`)).data; },
  async createType(scopeId, payload) { return (await apiRequest(`/scopes/${scopeId}/event-types`, { method: 'POST', body: JSON.stringify(payload) })).data; },
  async sections(scopeId) { return (await apiRequest(`/scopes/${scopeId}/event-sections`)).data; },
  async createSection(scopeId, payload) { return (await apiRequest(`/scopes/${scopeId}/event-sections`, { method: 'POST', body: JSON.stringify(payload) })).data; },
};
