// ── Auth ─────────────────────────────────────────────────────────────────────
export interface LoginRequest {
  email: string
  password: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

// ── User ─────────────────────────────────────────────────────────────────────
export interface UserProfile {
  id: number
  email: string
  full_name: string
  is_active: boolean
  roles: string[]
  permissions: string[]
}

export interface UserCreate {
  email: string
  full_name: string
  password: string
  is_active?: boolean
  role_ids?: number[]
}

export interface UserUpdate {
  full_name?: string
  password?: string
  is_active?: boolean
  role_ids?: number[]
}

export interface SelfUpdate {
  full_name?: string
  password?: string
}

// ── Role ─────────────────────────────────────────────────────────────────────
export interface Role {
  id: number
  name: string
  description?: string
  permissions?: Permission[]
}

export interface RoleCreate {
  name: string
  description?: string
  permission_ids?: number[]
}

export interface RoleUpdate {
  name?: string
  description?: string
  permission_ids?: number[]
}

// ── Permission ───────────────────────────────────────────────────────────────
export interface Permission {
  id: number
  name: string
  description?: string
}

export interface PermissionCreate {
  name: string
  description?: string
}

export interface PermissionUpdate {
  name?: string
  description?: string
}

// ── API Error ────────────────────────────────────────────────────────────────
export interface ApiError {
  detail: string | { msg: string; loc: string[] }[]
}

// ── Pagination ───────────────────────────────────────────────────────────────
export interface PaginationState {
  pageIndex: number
  pageSize: number
}

// ── Audit Log ────────────────────────────────────────────────────────────────
export interface AuditLog {
  id: number
  user_id: number | null
  user_email: string | null
  action: string
  resource_type: string | null
  resource_id: string | null
  result: 'success' | 'failure'
  ip_address: string | null
  user_agent: string | null
  changes: {
    before?: Record<string, unknown>
    after?: Record<string, unknown>
  } | null
  detail: string | null
  created_at: string
}

export interface AuditLogListResponse {
  items: AuditLog[]
  total: number
  skip: number
  limit: number
}

export interface AuditLogFilters {
  user_email?: string
  action?: string
  resource_type?: string
  result?: 'success' | 'failure' | ''
  date_from?: string
  date_to?: string
}

// ── Session ──────────────────────────────────────────────────────────────────
export interface Session {
  token_id: string
  user_id: number
  user_email?: string | null
  ip_address?: string | null
  user_agent?: string | null
  device_name?: string | null
  created_at: string
  expires_at: string
  is_current?: boolean
}

export interface SessionListResponse {
  items: Session[]
  total: number
}
