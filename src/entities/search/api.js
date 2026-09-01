import { apiRequest } from '../../api';

export const searchApi = {
  async find(scopeId, filters) {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, value);
    });
    return (await apiRequest(`/scopes/${scopeId}/search?${query}`)).data;
  },
};
