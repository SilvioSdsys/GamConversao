import { api } from './axios'
import type { Permission, PermissionCreate, PermissionUpdate } from '@/types'

export const permissionsApi = {
  list: async (): Promise<Permission[]> => {
    const res = await api.get<Permission[]>('/permissions/')
    return res.data
  },

  get: async (id: number): Promise<Permission> => {
    const res = await api.get<Permission>(`/permissions/${id}`)
    return res.data
  },

  create: async (data: PermissionCreate): Promise<Permission> => {
    const res = await api.post<Permission>('/permissions/', data)
    return res.data
  },

  update: async (id: number, data: PermissionUpdate): Promise<Permission> => {
    const res = await api.put<Permission>(`/permissions/${id}`, data)
    return res.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/permissions/${id}`)
  },
}
