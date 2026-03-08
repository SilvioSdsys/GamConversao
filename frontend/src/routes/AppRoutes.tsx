import { Routes, Route } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { LoginPage } from '@/features/auth/LoginPage'
import { ForbiddenPage } from '@/features/auth/ForbiddenPage'
import { NotFoundPage } from '@/features/auth/NotFoundPage'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { useAuthStore } from '@/stores/authStore'

// Lazy loading por feature
const DashboardPage = lazy(() =>
  import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage }))
)
const UsersPage = lazy(() =>
  import('@/features/users/UsersPage').then((m) => ({ default: m.UsersPage }))
)
const RolesPage = lazy(() =>
  import('@/features/roles/RolesPage').then((m) => ({ default: m.RolesPage }))
)
const PermissionsPage = lazy(() =>
  import('@/features/permissions/PermissionsPage').then((m) => ({
    default: m.PermissionsPage,
  }))
)
const ProfilePage = lazy(() =>
  import('@/features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage }))
)
const AuditLogPage = lazy(() =>
  import('@/features/audit/AuditLogPage').then((m) => ({ default: m.AuditLogPage }))
)
const MySessionsPage = lazy(() =>
  import('@/features/sessions/MySessionsPage').then((m) => ({ default: m.default }))
)
const AdminSessionsPage = lazy(() =>
  import('@/features/sessions/AdminSessionsPage').then((m) => ({ default: m.default }))
)

function ProtectedShell({
  children,
  permission,
}: {
  children: React.ReactNode
  permission?: string
}) {
  return (
    <ProtectedRoute requiredPermission={permission}>
      <AppShell>
        <Suspense fallback={<PageLoader />}>{children}</Suspense>
      </AppShell>
    </ProtectedRoute>
  )
}

export function AppRoutes() {
  const { setLoading } = useAuthStore()

  useEffect(() => {
    setLoading(false)
  }, [setLoading])

  return (
    <Routes>
      {/* Rotas públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="/404" element={<NotFoundPage />} />

      {/* Rotas protegidas com AppShell */}
      <Route path="/" element={<ProtectedShell><DashboardPage /></ProtectedShell>} />
      <Route
        path="/users"
        element={
          <ProtectedShell permission="users:read">
            <UsersPage />
          </ProtectedShell>
        }
      />
      <Route
        path="/roles"
        element={
          <ProtectedShell permission="roles:read">
            <RolesPage />
          </ProtectedShell>
        }
      />
      <Route
        path="/permissions"
        element={
          <ProtectedShell permission="permissions:read">
            <PermissionsPage />
          </ProtectedShell>
        }
      />
      <Route path="/profile" element={<ProtectedShell><ProfilePage /></ProtectedShell>} />
      <Route path="/sessions" element={<ProtectedShell><MySessionsPage /></ProtectedShell>} />
      <Route
        path="/sessions/admin"
        element={
          <ProtectedShell permission="sessions:read">
            <AdminSessionsPage />
          </ProtectedShell>
        }
      />
      <Route
        path="/audit-log"
        element={
          <ProtectedShell permission="audit:read">
            <AuditLogPage />
          </ProtectedShell>
        }
      />

      {/* Fallbacks */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
