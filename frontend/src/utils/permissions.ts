import type { Permission } from '@/types'

// Agrupa permissões por recurso: "users:read" → grupo "users"
export function groupPermissionsByResource(permissions: Permission[]) {
  const groups: Record<string, Permission[]> = {}

  for (const perm of permissions) {
    const [resource] = perm.name.split(':')
    if (!groups[resource]) groups[resource] = []
    groups[resource].push(perm)
  }

  // Ordenar recursos e permissões dentro de cada grupo
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([resource, perms]) => ({
      resource,
      permissions: perms.sort((a, b) => a.name.localeCompare(b.name)),
    }))
}

// Labels amigáveis para recursos
export const RESOURCE_LABELS: Record<string, string> = {
  users: 'Usuários',
  roles: 'Papéis',
  permissions: 'Permissões',
}

// Labels amigáveis para ações
export const ACTION_LABELS: Record<string, string> = {
  create: 'Criar',
  read: 'Visualizar',
  update: 'Editar',
  delete: 'Excluir',
}

export function getResourceLabel(resource: string): string {
  return RESOURCE_LABELS[resource] ?? resource
}

export function getActionFromPermission(permName: string): string {
  const [, action] = permName.split(':')
  return ACTION_LABELS[action ?? ''] ?? action ?? permName
}
