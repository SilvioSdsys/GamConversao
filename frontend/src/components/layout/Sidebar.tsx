import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Shield,
  Key,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  MonitorSmartphone,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAuthStore } from '@/stores/authStore'
import { usePermission } from '@/hooks/usePermission'
import { Avatar, AvatarFallback, getInitials } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { authApi } from '@/api/auth.api'

interface NavItem {
  label: string
  to: string
  icon: React.ElementType
  permission?: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Usuários', to: '/users', icon: Users, permission: 'users:read' },
  { label: 'Papéis', to: '/roles', icon: Shield, permission: 'roles:read' },
  { label: 'Permissões', to: '/permissions', icon: Key, permission: 'permissions:read' },
  { label: 'Audit Log', to: '/audit-log', icon: ClipboardList, permission: 'audit:read' },
  { label: 'Minhas Sessões', to: '/sessions', icon: MonitorSmartphone },
  { label: 'Sessões do Sistema', to: '/sessions/admin', icon: Users, permission: 'sessions:read' },
]

const BOTTOM_ITEMS: NavItem[] = [{ label: 'Meu Perfil', to: '/profile', icon: User }]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobile?: boolean
}

function SideNavItem({
  item,
  collapsed,
  onClick,
}: {
  item: NavItem
  collapsed: boolean
  onClick?: () => void
}) {
  const hasPermission = usePermission(item.permission)
  if (item.permission && !hasPermission) return null

  const linkContent = (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          'hover:bg-white/10 hover:text-white',
          isActive ? 'bg-white/15 text-white' : 'text-blue-100/80',
          collapsed && 'justify-center px-2'
        )
      }
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  )

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    )
  }

  return linkContent
}

export function Sidebar({ collapsed, onToggle, mobile = false }: SidebarProps) {
  const { user, logout: clearAuth, refreshToken } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      if (refreshToken) await authApi.logout(refreshToken)
    } catch {
      /* silent */
    }
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'flex flex-col bg-primary text-white transition-all duration-300',
          mobile ? 'w-60' : collapsed ? 'w-[60px]' : 'w-60',
          'h-full'
        )}
      >
        {/* Logo + Toggle */}
        <div
          className={cn(
            'flex h-14 items-center border-b border-white/10 px-3',
            collapsed ? 'justify-center' : 'justify-between'
          )}
        >
          {!collapsed && (
            <span className="font-bold text-base tracking-wide">GamConversao</span>
          )}
          {!mobile && (
            <button
              onClick={onToggle}
              className="rounded-md p-1.5 hover:bg-white/10 transition-colors"
              aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* Navegação principal */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <SideNavItem
              key={item.to}
              item={item}
              collapsed={collapsed}
              onClick={mobile ? onToggle : undefined}
            />
          ))}
        </nav>

        <div className="px-2 pb-2">
          <Separator className="bg-white/10 mb-2" />

          {/* Itens inferiores */}
          {BOTTOM_ITEMS.map((item) => (
            <SideNavItem
              key={item.to}
              item={item}
              collapsed={collapsed}
              onClick={mobile ? onToggle : undefined}
            />
          ))}

          <Separator className="bg-white/10 my-2" />

          {/* Usuário + Logout */}
          <div
            className={cn(
              'flex items-center gap-2 rounded-md px-2 py-2',
              collapsed && 'justify-center flex-col'
            )}
          >
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="text-[10px]">
                {user ? getInitials(user.full_name) : '??'}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{user?.full_name}</p>
                <p className="text-[10px] text-blue-100/60 truncate">{user?.email}</p>
              </div>
            )}
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  className="rounded-md p-1.5 hover:bg-white/10 transition-colors text-blue-100/80 hover:text-white"
                  aria-label="Sair"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Sair</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
