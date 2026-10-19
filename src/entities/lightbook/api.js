import { apiRequest } from '../../api';

const data = (promise) => promise.then((response) => response.data);
const json = (method, payload) => ({ method, body: JSON.stringify(payload) });
const base = (scopeId) => `/scopes/${scopeId}/lightbooks`;
const pagePath = (scopeId, lightbookId, pageId) => `${base(scopeId)}/${lightbookId}/pages/${pageId}`;

export const lightbookApi = {
  list: (scopeId) => data(apiRequest(base(scopeId))),
  create: (scopeId, payload) => data(apiRequest(base(scopeId), json('POST', payload))),
  show: (scopeId, lightbookId) => data(apiRequest(`${base(scopeId)}/${lightbookId}`)),
  update: (scopeId, lightbookId, payload) => data(apiRequest(`${base(scopeId)}/${lightbookId}`, json('PATCH', payload))),
  delete: (scopeId, lightbookId) => apiRequest(`${base(scopeId)}/${lightbookId}`, { method: 'DELETE' }),
  page: (scopeId, lightbookId, pageId) => data(apiRequest(pagePath(scopeId, lightbookId, pageId))),
  updatePage: (scopeId, lightbookId, pageId, payload) => data(apiRequest(pagePath(scopeId, lightbookId, pageId), json('PATCH', payload))),
  pageComments: (scopeId, lightbookId, pageId) => data(apiRequest(`${pagePath(scopeId, lightbookId, pageId)}/comments`)),
  createPageComment: (scopeId, lightbookId, pageId, content, parentId = null) => data(apiRequest(`${pagePath(scopeId, lightbookId, pageId)}/comments`, json('POST', { content, parent_id: parentId }))),
  deletePageComment: (scopeId, lightbookId, pageId, commentId) => apiRequest(`${pagePath(scopeId, lightbookId, pageId)}/comments/${commentId}`, { method: 'DELETE' }),
  createBlock: (scopeId, lightbookId, pageId, payload) => data(apiRequest(`${pagePath(scopeId, lightbookId, pageId)}/blocks`, json('POST', payload))),
  deleteBlock: (scopeId, lightbookId, pageId, groupId) => apiRequest(`${pagePath(scopeId, lightbookId, pageId)}/blocks/${groupId}`, { method: 'DELETE' }),
  reorderBlocks: (scopeId, lightbookId, pageId, items) => apiRequest(`${pagePath(scopeId, lightbookId, pageId)}/blocks/reorder`, json('POST', { items })),
  createVersion: (scopeId, lightbookId, pageId, groupId, payload) => data(apiRequest(`${pagePath(scopeId, lightbookId, pageId)}/blocks/${groupId}/versions`, json('POST', payload))),
  acquireEditing: (scopeId, lightbookId, pageId) => data(apiRequest(`${pagePath(scopeId, lightbookId, pageId)}/editing`, json('POST', {}))),
  releaseEditing: (scopeId, lightbookId, pageId) => data(apiRequest(`${pagePath(scopeId, lightbookId, pageId)}/editing`, json('DELETE', {}))),
  cancelEditing: (scopeId, lightbookId, pageId) => data(apiRequest(`${pagePath(scopeId, lightbookId, pageId)}/editing/cancel`, json('POST', {}))),
  pageVersions: (scopeId, lightbookId, pageId) => data(apiRequest(`${pagePath(scopeId, lightbookId, pageId)}/versions`)),
  pageVersion: (scopeId, lightbookId, pageId, versionId) => data(apiRequest(`${pagePath(scopeId, lightbookId, pageId)}/versions/${versionId}`)),
  restorePageVersion: (scopeId, lightbookId, pageId, versionId) => data(apiRequest(`${pagePath(scopeId, lightbookId, pageId)}/versions/${versionId}/restore`, json('POST', {}))),
};
