import { useAuthStore } from '@/stores/authStore'

/**
 * Verifica se o usuário logado possui uma permissão específica.
 * Quando permission é undefined, retorna true (item sempre visível).
 * Uso: const canCreate = usePermission('users:create')
 */
export function usePermission(permission: string | undefined): boolean {
  const user = useAuthStore((s) => s.user)
  if (!user) return false
  if (!permission) return true
  return user.permissions.includes(permission)
}

/**
 * Verifica se o usuário possui pelo menos uma das permissões fornecidas.
 */
export function useAnyPermission(permissions: string[]): boolean {
  const user = useAuthStore((s) => s.user)
  if (!user) return false
  return permissions.some((p) => user.permissions.includes(p))
}

/**
 * Verifica se o usuário possui um papel específico.
 */
export function useRole(role: string): boolean {
  const user = useAuthStore((s) => s.user)
  if (!user) return false
  return user.roles.includes(role)
}
