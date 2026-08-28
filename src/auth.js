import { create } from 'zustand';
import { ApiError, authApi } from './api';
export const useAuth = create((set) => ({
    user: null,
    status: 'checking',
    check: async () => {
        try {
            set({ user: await authApi.me(), status: 'authenticated' });
        }
        catch (error) {
            if (!(error instanceof ApiError) || error.status !== 401)
                console.error(error);
            set({ user: null, status: 'guest' });
        }
    },
    login: async (identity, password) => set({ user: await authApi.login(identity, password), status: 'authenticated' }),
    logout: async () => { try {
        await authApi.logout();
    }
    finally {
        set({ user: null, status: 'guest' });
    } },
}));
