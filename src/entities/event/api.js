import { apiRequest } from '../../api';

export const eventApi = {
  async calendar(scopeId, params, signal) {
    const events = [];
    let page = 1;
    let lastPage = 1;
    do {
      const query = new URLSearchParams(Object.entries({ ...params, page, per_page: 200 }).filter(([, value]) => value !== '' && value != null));
      const result = await apiRequest(`/scopes/${scopeId}/events/calendar?${query}`, { signal });
      events.push(...result.data);
      lastPage = result.meta.last_page;
      page++;
    } while (page <= lastPage);
    return events;
  },
  async list(scopeId, params = {}) { const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value != null)); return apiRequest(`/scopes/${scopeId}/events?${query}`); },
  async get(scopeId, eventId) { return (await apiRequest(`/scopes/${scopeId}/events/${eventId}`)).data; },
  async create(scopeId, payload) { return (await apiRequest(`/scopes/${scopeId}/events`, { method: 'POST', body: JSON.stringify(payload) })).data; },
  async update(scopeId, eventId, payload) { return (await apiRequest(`/scopes/${scopeId}/events/${eventId}`, { method: 'PATCH', body: JSON.stringify(payload) })).data; },
  remove(scopeId, eventId) { return apiRequest(`/scopes/${scopeId}/events/${eventId}`, { method: 'DELETE' }); },
  async comments(scopeId, eventId) { return (await apiRequest(`/scopes/${scopeId}/events/${eventId}/comments`)).data; },
  async comment(scopeId, eventId, content) { return (await apiRequest(`/scopes/${scopeId}/events/${eventId}/comments`, { method: 'POST', body: JSON.stringify({ content }) })).data; },
  async types(scopeId) { return (await apiRequest(`/scopes/${scopeId}/event-types`)).data; },
  async createType(scopeId, payload) { return (await apiRequest(`/scopes/${scopeId}/event-types`, { method: 'POST', body: JSON.stringify(payload) })).data; },
  async sections(scopeId) { return (await apiRequest(`/scopes/${scopeId}/event-sections`)).data; },
  async createSection(scopeId, payload) { return (await apiRequest(`/scopes/${scopeId}/event-sections`, { method: 'POST', body: JSON.stringify(payload) })).data; },
};
