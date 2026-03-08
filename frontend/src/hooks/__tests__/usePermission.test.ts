import { renderHook } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { usePermission, useAnyPermission, useRole } from '../usePermission'
import { useAuthStore } from '@/stores/authStore'

describe('usePermission', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: 1,
        email: 'admin@test.com',
        full_name: 'Admin',
        is_active: true,
        roles: ['admin'],
        permissions: ['users:read', 'users:create', 'roles:read'],
      },
      isAuthenticated: true,
      accessToken: 'fake-token',
      refreshToken: 'fake-refresh',
      isLoading: false,
    })
  })

  it('retorna true para permissão existente', () => {
    const { result } = renderHook(() => usePermission('users:read'))
    expect(result.current).toBe(true)
  })

  it('retorna false para permissão inexistente', () => {
    const { result } = renderHook(() => usePermission('users:delete'))
    expect(result.current).toBe(false)
  })

  it('retorna true quando permission é undefined', () => {
    const { result } = renderHook(() => usePermission(undefined))
    expect(result.current).toBe(true)
  })

  it('retorna false quando não há usuário logado', () => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
    })
    const { result } = renderHook(() => usePermission('users:read'))
    expect(result.current).toBe(false)
  })
})

describe('useAnyPermission', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: 1,
        email: 'admin@test.com',
        full_name: 'Admin',
        is_active: true,
        roles: ['admin'],
        permissions: ['users:read', 'roles:read'],
      },
      isAuthenticated: true,
      accessToken: 'fake-token',
      refreshToken: 'fake-refresh',
      isLoading: false,
    })
  })

  it('retorna true quando possui pelo menos uma permissão', () => {
    const { result } = renderHook(() =>
      useAnyPermission(['users:delete', 'users:read'])
    )
    expect(result.current).toBe(true)
  })

  it('retorna false quando não possui nenhuma permissão', () => {
    const { result } = renderHook(() =>
      useAnyPermission(['users:delete', 'users:create'])
    )
    expect(result.current).toBe(false)
  })
})

describe('useRole', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: 1,
        email: 'admin@test.com',
        full_name: 'Admin',
        is_active: true,
        roles: ['admin', 'manager'],
        permissions: [],
      },
      isAuthenticated: true,
      accessToken: 'fake-token',
      refreshToken: 'fake-refresh',
      isLoading: false,
    })
  })

  it('retorna true para role existente', () => {
    const { result } = renderHook(() => useRole('admin'))
    expect(result.current).toBe(true)
  })

  it('retorna false para role inexistente', () => {
    const { result } = renderHook(() => useRole('superadmin'))
    expect(result.current).toBe(false)
  })
})
