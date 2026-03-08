import { api } from './axios'
import type { UserProfile, UserCreate, UserUpdate } from '@/types'

export const usersApi = {
  list: async (): Promise<UserProfile[]> => {
    const res = await api.get<UserProfile[]>('/users/')
    return res.data
  },

  get: async (id: number): Promise<UserProfile> => {
    const res = await api.get<UserProfile>(`/users/${id}`)
    return res.data
  },

  create: async (data: UserCreate): Promise<UserProfile> => {
    const res = await api.post<UserProfile>('/users/', data)
    return res.data
  },

  update: async (id: number, data: UserUpdate): Promise<UserProfile> => {
    const res = await api.put<UserProfile>(`/users/${id}`, data)
    return res.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/users/${id}`)
  },

  updateMe: async (data: {
    full_name?: string
    password?: string
  }): Promise<UserProfile> => {
    const res = await api.put<UserProfile>('/users/me', data)
    return res.data
  },
}
