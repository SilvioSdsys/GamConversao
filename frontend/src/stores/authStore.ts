import { create } from 'zustand'
import type { UserProfile } from '@/types'

interface AuthState {
  // Estado
  user: UserProfile | null
  accessToken: string | null
  refreshToken: string | null // usado pelo interceptor — nunca persista no localStorage
  isAuthenticated: boolean
  isLoading: boolean

  // Actions
  setTokens: (access: string, refresh: string) => void
  setUser: (user: UserProfile) => void
  logout: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true, // true no startup até verificar sessão

  setTokens: (access, refresh) =>
    set({ accessToken: access, refreshToken: refresh, isAuthenticated: true }),

  setUser: (user) => set({ user }),

  logout: () =>
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    }),

  setLoading: (isLoading) => set({ isLoading }),
}))
