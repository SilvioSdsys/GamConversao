import { api } from './axios'
import type { LoginRequest, TokenResponse, UserProfile } from '@/types'

export const authApi = {
  login: async (data: LoginRequest): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/login', data)
    return response.data
  },

  refresh: async (refreshToken: string): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    })
    return response.data
  },

  logout: async (refreshToken: string): Promise<void> => {
    await api.post('/auth/logout', { refresh_token: refreshToken })
  },

  me: async (): Promise<UserProfile> => {
    const response = await api.get<UserProfile>('/users/me')
    return response.data
  },
}
