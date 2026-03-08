import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { PageLoader } from '@/components/shared/LoadingSpinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPermission?: string
}

export function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuthStore()
  const location = useLocation()

  if (isLoading) {
    return <PageLoader />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredPermission && user) {
    const hasPermission = user.permissions.includes(requiredPermission)
    if (!hasPermission) {
      return <Navigate to="/403" replace />
    }
  }

  return <>{children}</>
}
