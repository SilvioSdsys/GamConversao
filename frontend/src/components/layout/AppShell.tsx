import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Fechar drawer mobile ao redimensionar para desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar Desktop */}
      <div className="hidden md:flex h-full">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Sidebar Mobile (Drawer) */}
      {mobileOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 z-50 md:hidden animate-fade-in">
            <Sidebar
              collapsed={false}
              onToggle={() => setMobileOpen(false)}
              mobile
            />
          </div>
        </>
      )}

      {/* Conteúdo principal */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMobileMenuOpen={() => setMobileOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
