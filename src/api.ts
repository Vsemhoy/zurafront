export type AuthUser = { id: string; name: string; username: string | null; email: string }
export type Resource<T> = { data: T }
export type ResourceCollection<T> = { data: T[]; meta?: { current_page: number; last_page: number; total: number } }

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: 'include',
    headers: { Accept: 'application/json', 'X-App-Request': 'Zuratax', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string; errors?: Record<string, string[]> } | null
    const validationMessage = payload?.errors ? Object.values(payload.errors)[0]?.[0] : undefined
    throw new ApiError(validationMessage ?? payload?.message ?? 'Request failed.', response.status)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const authApi = {
  async me(): Promise<AuthUser> { return (await apiRequest<Resource<AuthUser>>('/auth/me')).data },
  async login(identity: string, password: string): Promise<AuthUser> {
    return (await apiRequest<Resource<AuthUser>>('/auth/login', { method: 'POST', body: JSON.stringify({ identity, password }) })).data
  },
  logout(): Promise<void> { return apiRequest('/auth/logout', { method: 'POST', body: '{}' }) },
}
