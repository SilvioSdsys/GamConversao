import { api } from './axios'
import type { AuditLogListResponse, AuditLogFilters } from '@/types'

export const auditApi = {
  list: async (
    filters: AuditLogFilters & { skip?: number; limit?: number }
  ): Promise<AuditLogListResponse> => {
    const params: Record<string, string | number | undefined> = {
      skip: filters.skip ?? 0,
      limit: filters.limit ?? 50,
    }
    if (filters.user_email) params.user_email = filters.user_email
    if (filters.action) params.action = filters.action
    if (filters.resource_type) params.resource_type = filters.resource_type
    if (filters.result) params.result = filters.result
    if (filters.date_from) params.date_from = filters.date_from
    if (filters.date_to) params.date_to = filters.date_to

    const res = await api.get<AuditLogListResponse>('/audit-logs/', { params })
    return res.data
  },

  exportCsv: async (filters: AuditLogFilters = {}): Promise<Blob> => {
    const params: Record<string, string | undefined> = {}
    if (filters.user_email) params.user_email = filters.user_email
    if (filters.action) params.action = filters.action
    if (filters.resource_type) params.resource_type = filters.resource_type
    if (filters.result) params.result = filters.result
    if (filters.date_from) params.date_from = filters.date_from
    if (filters.date_to) params.date_to = filters.date_to

    const res = await api.get<Blob>('/audit-logs/export', {
      params,
      responseType: 'blob',
    })
    return res.data
  },
}
