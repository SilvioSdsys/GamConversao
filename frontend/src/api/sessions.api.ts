import { api } from './axios'
import type { SessionListResponse } from '@/types'

export const sessionsApi = {
  listMy: async (): Promise<SessionListResponse> => {
    const { data } = await api.get<SessionListResponse>('/sessions/')
    return data
  },

  listAll: async (
    params: { skip?: number; limit?: number } = {}
  ): Promise<SessionListResponse> => {
    const { data } = await api.get<SessionListResponse>('/sessions/all', {
      params,
    })
    return data
  },

  revoke: async (tokenId: string): Promise<void> => {
    await api.delete(`/sessions/${tokenId}`)
  },

  adminRevoke: async (tokenId: string): Promise<void> => {
    await api.delete(`/sessions/admin/${tokenId}`)
  },

  logoutAll: async (): Promise<void> => {
    await api.post('/auth/logout-all')
  },
}
