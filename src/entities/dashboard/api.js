import { apiRequest } from '../../api';

export const dashboardApi = {
  async show(scopeId) {
    return (await apiRequest(`/scopes/${scopeId}/dashboard`)).data;
  },
};
