import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/api/auth.api'
import { useAuthStore } from '@/stores/authStore'
import type { LoginRequest } from '@/types'

export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    setTokens,
    setUser,
    logout: clearAuth,
    refreshToken,
  } = useAuthStore()
  const navigate = useNavigate()

  const login = useCallback(
    async (credentials: LoginRequest) => {
      const tokens = await authApi.login(credentials)
      setTokens(tokens.access_token, tokens.refresh_token)

      const profile = await authApi.me()
      setUser(profile)

      navigate('/', { replace: true })
    },
    [setTokens, setUser, navigate]
  )

  const logout = useCallback(async () => {
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken)
      }
    } catch {
      // silencioso — logout local ocorre de qualquer forma
    } finally {
      clearAuth()
      navigate('/login', { replace: true })
    }
  }, [refreshToken, clearAuth, navigate])

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
  }
}
