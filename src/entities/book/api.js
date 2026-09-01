import { apiRequest } from '../../api';
const data = (promise) => promise.then((response) => response.data);
const json = (method, payload) => ({ method, body: JSON.stringify(payload) });
export const bookApi = {
    spaces: (scopeId) => data(apiRequest(`/scopes/${scopeId}/book-spaces`)),
    createSpace: (scopeId, payload) => data(apiRequest(`/scopes/${scopeId}/book-spaces`, json('POST', payload))),
    books: (scopeId) => data(apiRequest(`/scopes/${scopeId}/books`)),
    createBook: (scopeId, payload) => data(apiRequest(`/scopes/${scopeId}/books`, json('POST', payload))),
    updateBook: (scopeId, bookId, payload) => data(apiRequest(`/scopes/${scopeId}/books/${bookId}`, json('PATCH', payload))),
    deleteBook: (scopeId, bookId) => apiRequest(`/scopes/${scopeId}/books/${bookId}`, { method: 'DELETE' }),
    pages: (scopeId, bookId) => data(apiRequest(`/scopes/${scopeId}/books/${bookId}/pages`)),
    createPage: (scopeId, bookId, payload) => data(apiRequest(`/scopes/${scopeId}/books/${bookId}/pages`, json('POST', payload))),
    page: (scopeId, bookId, pageId) => data(apiRequest(`/scopes/${scopeId}/books/${bookId}/pages/${pageId}`)),
    updatePage: (scopeId, bookId, pageId, payload) => data(apiRequest(`/scopes/${scopeId}/books/${bookId}/pages/${pageId}`, json('PATCH', payload))),
    createBlock: (scopeId, bookId, pageId, payload) => data(apiRequest(`/scopes/${scopeId}/books/${bookId}/pages/${pageId}/blocks`, json('POST', payload))),
    reorderBlocks: (scopeId, bookId, pageId, items) => apiRequest(`/scopes/${scopeId}/books/${bookId}/pages/${pageId}/blocks/reorder`, json('POST', { items })),
    createVersion: (scopeId, bookId, pageId, groupId, payload) => data(apiRequest(`/scopes/${scopeId}/books/${bookId}/pages/${pageId}/blocks/${groupId}/versions`, json('POST', payload))),
    acquireEditing: (scopeId, bookId, pageId) => data(apiRequest(`/scopes/${scopeId}/books/${bookId}/pages/${pageId}/editing`, json('POST', {}))),
    releaseEditing: (scopeId, bookId, pageId) => data(apiRequest(`/scopes/${scopeId}/books/${bookId}/pages/${pageId}/editing`, json('DELETE', {}))),
    cancelEditing: (scopeId, bookId, pageId) => data(apiRequest(`/scopes/${scopeId}/books/${bookId}/pages/${pageId}/editing/cancel`, json('POST', {}))),
    pageVersions: (scopeId, bookId, pageId) => data(apiRequest(`/scopes/${scopeId}/books/${bookId}/pages/${pageId}/versions`)),
    pageVersion: (scopeId, bookId, pageId, versionId) => data(apiRequest(`/scopes/${scopeId}/books/${bookId}/pages/${pageId}/versions/${versionId}`)),
    restorePageVersion: (scopeId, bookId, pageId, versionId) => data(apiRequest(`/scopes/${scopeId}/books/${bookId}/pages/${pageId}/versions/${versionId}/restore`, json('POST', {}))),
};
