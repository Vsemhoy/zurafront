import { apiRequest } from '../../api';

const base = (scope) => `/scopes/${scope}/specifications`;
const json = (method, data) => ({ method, body: JSON.stringify(data) });
const data = (request) => request.then((result) => result.data);
export const specifierApi = {
  list: (scope, filters, signal) => apiRequest(`${base(scope)}?${new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== ''))}`, { signal }),
  options: (scope) => data(apiRequest(`${base(scope)}/options`)),
  show: (scope, id) => data(apiRequest(`${base(scope)}/${id}`)),
  create: (scope, value) => data(apiRequest(base(scope), json('POST', value))),
  update: (scope, id, value) => data(apiRequest(`${base(scope)}/${id}`, json('PATCH', value))),
  remove: (scope, id, revision) => apiRequest(`${base(scope)}/${id}`, json('DELETE', { revision })),
  item: (scope, id, itemId, value) => data(apiRequest(`${base(scope)}/${id}/items${itemId ? `/${itemId}` : ''}`, json(itemId ? 'PATCH' : 'POST', value))),
  removeItem: (scope, id, itemId, revision) => data(apiRequest(`${base(scope)}/${id}/items/${itemId}`, json('DELETE', { revision }))),
  outline: (scope, id, revision, items) => data(apiRequest(`${base(scope)}/${id}/outline`, json('PUT', { revision, items }))),
  approve: (scope, id, revision, reopen = false) => data(apiRequest(`${base(scope)}/${id}/${reopen ? 'revise' : 'approve'}`, json('POST', { revision }))),
  version: (scope, id, version) => data(apiRequest(`${base(scope)}/${id}/versions/${version}`)),
  deriveTask: (scope, id, itemId, value) => data(apiRequest(`${base(scope)}/${id}/items/${itemId}/tasks`, json('POST', value))),
  candidates: (scope, id, q, page = 1) => apiRequest(`${base(scope)}/${id}/candidates?${new URLSearchParams({ q, page })}`),
  linkTask: (scope, id, itemId, revision, task_id) => data(apiRequest(`${base(scope)}/${id}/items/${itemId}/task-links`, json('POST', { revision, task_id }))),
  comments: (scope, id, itemId, page) => apiRequest(`${base(scope)}/${id}/items/${itemId}/comments?page=${page}`),
  comment: (scope, id, itemId, value, commentId) => data(apiRequest(`${base(scope)}/${id}/items/${itemId}/comments${commentId ? `/${commentId}` : ''}`, json(commentId ? 'DELETE' : 'POST', value))),
};
