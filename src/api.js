export class ApiError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}
export async function apiRequest(path, init = {}) {
    const response = await fetch(`/api${path}`, {
        ...init,
        credentials: 'include',
        headers: { Accept: 'application/json', 'X-App-Request': 'Zuratax', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
    });
    if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const validationMessage = payload?.errors ? Object.values(payload.errors)[0]?.[0] : undefined;
        throw new ApiError(validationMessage ?? payload?.message ?? 'Request failed.', response.status);
    }
    if (response.status === 204)
        return undefined;
    return response.json();
}
export const authApi = {
    async me() { return (await apiRequest('/auth/me')).data; },
    async login(identity, password) {
        return (await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ identity, password }) })).data;
    },
    logout() { return apiRequest('/auth/logout', { method: 'POST', body: '{}' }); },
};
