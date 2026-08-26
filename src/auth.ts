import { create } from 'zustand'
import { ApiError, authApi, type AuthUser } from './api'

type AuthState = {
  user: AuthUser | null
  status: 'checking' | 'guest' | 'authenticated'
  check: () => Promise<void>
  login: (identity: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  status: 'checking',
  check: async () => {
    try { set({ user: await authApi.me(), status: 'authenticated' }) }
    catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) console.error(error)
      set({ user: null, status: 'guest' })
    }
  },
  login: async (identity, password) => set({ user: await authApi.login(identity, password), status: 'authenticated' }),
  logout: async () => { try { await authApi.logout() } finally { set({ user: null, status: 'guest' }) } },
}))
