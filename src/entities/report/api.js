import { apiRequest } from '../../api';

const base = (scopeId) => `/scopes/${scopeId}/reports/monthly`;
export const reportApi = {
  async get(scopeId, filters) { return (await apiRequest(`${base(scopeId)}?${new URLSearchParams(filters)}`)).data; },
  archives(scopeId, filters, page) { return apiRequest(`${base(scopeId)}/archives?${new URLSearchParams({ ...filters, page })}`); },
  async save(scopeId, filters) { return (await apiRequest(`${base(scopeId)}/archives`, { method: 'POST', body: JSON.stringify(filters) })).data; },
  async download(scopeId, report) {
    const blob = await apiRequest(`${base(scopeId)}/archives/${report.id}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Zuratax-${report.month}-${report.id}.xlsx`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  candidates(scopeId, q, page) { return apiRequest(`${base(scopeId)}/candidates?${new URLSearchParams({ q, page })}`); },
  async savePlan(scopeId, payload) { return (await apiRequest(`${base(scopeId)}/plans`, { method: 'POST', body: JSON.stringify(payload) })).data; },
  deletePlan(scopeId, id) { return apiRequest(`${base(scopeId)}/plans/${id}`, { method: 'DELETE' }); },
};
