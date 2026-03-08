import { Menu } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { Avatar, AvatarFallback, getInitials } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'

const ROUTE_LABELS: Record<string, string> = {
  '/': 'Dashboard',
  '/users': 'Usuários',
  '/roles': 'Papéis',
  '/permissions': 'Permissões',
  '/profile': 'Meu Perfil',
}

interface HeaderProps {
  onMobileMenuOpen: () => void
}

export function Header({ onMobileMenuOpen }: HeaderProps) {
  const user = useAuthStore((s) => s.user)
  const { pathname } = useLocation()

  const pageTitle = ROUTE_LABELS[pathname] || 'GamConversao'

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-4 shadow-sm">
      {/* Mobile menu button + Page title */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMobileMenuOpen}
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div>
          <h1 className="text-base font-semibold text-foreground">{pageTitle}</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">
            {import.meta.env.VITE_APP_NAME || 'GamConversao'}
          </p>
        </div>
      </div>

      {/* Avatar + Nome */}
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-sm font-medium text-foreground">{user?.full_name}</span>
          <span className="text-xs text-muted-foreground">
            {user?.roles[0] ?? 'Usuário'}
          </span>
        </div>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">
            {user ? getInitials(user.full_name) : '??'}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
