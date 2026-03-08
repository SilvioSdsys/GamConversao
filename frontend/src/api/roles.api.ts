import { api } from './axios'
import type { Role, RoleCreate, RoleUpdate } from '@/types'

export const rolesApi = {
  list: async (): Promise<Role[]> => {
    const res = await api.get<Role[]>('/roles/')
    return res.data
  },

  get: async (id: number): Promise<Role> => {
    const res = await api.get<Role>(`/roles/${id}`)
    return res.data
  },

  create: async (data: RoleCreate): Promise<Role> => {
    const res = await api.post<Role>('/roles/', data)
    return res.data
  },

  update: async (id: number, data: RoleUpdate): Promise<Role> => {
    const res = await api.put<Role>(`/roles/${id}`, data)
    return res.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/roles/${id}`)
  },
}
