import { useEffect, useState } from 'react'
import { Users, Shield, Key, Activity, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/authStore'
import { usePermission } from '@/hooks/usePermission'
import { usersApi } from '@/api/users.api'
import { rolesApi } from '@/api/roles.api'
import { permissionsApi } from '@/api/permissions.api'

interface StatCard {
  title: string
  value: number | null
  icon: React.ElementType
  description: string
  href: string
  permission: string
  color: string
}

function StatCardComponent({ card }: { card: StatCard }) {
  const navigate = useNavigate()
  const Icon = card.icon

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(card.href)}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {card.title}
        </CardTitle>
        <div className={`rounded-full p-2 ${card.color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        {card.value === null ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-3xl font-bold text-foreground">{card.value}</div>
        )}
        <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [counts, setCounts] = useState<{
    users: number | null
    roles: number | null
    permissions: number | null
    activeUsers: number | null
  }>({ users: null, roles: null, permissions: null, activeUsers: null })

  const canReadUsers = usePermission('users:read')
  const canReadRoles = usePermission('roles:read')
  const canReadPermissions = usePermission('permissions:read')

  useEffect(() => {
    async function loadCounts() {
      const updates: typeof counts = {
        users: null,
        roles: null,
        permissions: null,
        activeUsers: null,
      }

      if (canReadUsers) {
        try {
          const users = await usersApi.list()
          updates.users = users.length
          updates.activeUsers = users.filter((u) => u.is_active).length
        } catch {
          updates.users = 0
          updates.activeUsers = 0
        }
      }

      if (canReadRoles) {
        try {
          const roles = await rolesApi.list()
          updates.roles = roles.length
        } catch {
          updates.roles = 0
        }
      }

      if (canReadPermissions) {
        try {
          const perms = await permissionsApi.list()
          updates.permissions = perms.length
        } catch {
          updates.permissions = 0
        }
      }

      setCounts(updates)
    }

    loadCounts()
  }, [canReadUsers, canReadRoles, canReadPermissions])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  const statCards: StatCard[] = [
    {
      title: 'Total de Usuários',
      value: counts.users,
      icon: Users,
      description: 'Usuários cadastrados no sistema',
      href: '/users',
      permission: 'users:read',
      color: 'bg-primary',
    },
    {
      title: 'Usuários Ativos',
      value: counts.activeUsers,
      icon: Activity,
      description: 'Contas ativas no momento',
      href: '/users',
      permission: 'users:read',
      color: 'bg-success',
    },
    {
      title: 'Papéis',
      value: counts.roles,
      icon: Shield,
      description: 'Papéis de acesso configurados',
      href: '/roles',
      permission: 'roles:read',
      color: 'bg-primary-light',
    },
    {
      title: 'Permissões',
      value: counts.permissions,
      icon: Key,
      description: 'Permissões no sistema',
      href: '/permissions',
      permission: 'permissions:read',
      color: 'bg-accent',
    },
  ]

  const visibleCards = statCards.filter((c) =>
    c.permission === 'users:read'
      ? canReadUsers
      : c.permission === 'roles:read'
        ? canReadRoles
        : canReadPermissions
  )

  const navigate = useNavigate()

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Saudação */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          {getGreeting()}, {user?.full_name?.split(' ')[0]}!
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Bem-vindo ao painel de controle do GamConversao.
        </p>
      </div>

      {/* Cards de resumo */}
      {visibleCards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {visibleCards.map((card) => (
            <StatCardComponent key={card.title} card={card} />
          ))}
        </div>
      )}

      {/* Perfil do usuário logado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Minha Conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{user?.full_name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/profile')}>
              Editar Perfil <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {user?.roles.map((r) => (
              <Badge key={r} variant="default" className="text-xs">
                {r}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Atalhos rápidos */}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-3">Atalhos rápidos</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {canReadUsers && (
            <button
              onClick={() => navigate('/users')}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4 hover:bg-muted/10 transition-colors text-left"
            >
              <Users className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium">Gerenciar Usuários</p>
                <p className="text-xs text-muted-foreground">Ver e editar usuários</p>
              </div>
            </button>
          )}
          {canReadRoles && (
            <button
              onClick={() => navigate('/roles')}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4 hover:bg-muted/10 transition-colors text-left"
            >
              <Shield className="h-5 w-5 text-primary-light shrink-0" />
              <div>
                <p className="text-sm font-medium">Gerenciar Papéis</p>
                <p className="text-xs text-muted-foreground">Configurar papéis e permissões</p>
              </div>
            </button>
          )}
          {canReadPermissions && (
            <button
              onClick={() => navigate('/permissions')}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4 hover:bg-muted/10 transition-colors text-left"
            >
              <Key className="h-5 w-5 text-accent shrink-0" />
              <div>
                <p className="text-sm font-medium">Ver Permissões</p>
                <p className="text-xs text-muted-foreground">Listar e organizar permissões</p>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
