import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { LogOut, RefreshCw, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { sessionsApi } from '@/api/sessions.api'
import { useAuthStore } from '@/stores/authStore'
import { SessionCard } from './SessionCard'
import type { Session } from '@/types'

export default function MySessionsPage() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [showLogoutAllDialog, setShowLogoutAllDialog] = useState(false)
  const [loggingOutAll, setLoggingOutAll] = useState(false)
  const { logout } = useAuthStore()

  const currentTokenId = sessions.length > 0 ? sessions[0].token_id : null

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const data = await sessionsApi.listMy()
      setSessions(data.items)
    } catch {
      toast.error('Erro ao carregar sessões')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  const handleRevoke = async (tokenId: string) => {
    setRevokingId(tokenId)
    try {
      await sessionsApi.revoke(tokenId)
      toast.success('Sessão encerrada')
      setSessions((prev) => prev.filter((s) => s.token_id !== tokenId))
    } catch {
      toast.error('Erro ao encerrar sessão')
    } finally {
      setRevokingId(null)
    }
  }

  const handleLogoutAll = async () => {
    setLoggingOutAll(true)
    try {
      await sessionsApi.logoutAll()
      toast.success('Todas as sessões foram encerradas')
      logout()
      navigate('/login', { replace: true })
    } catch {
      toast.error('Erro ao encerrar todas as sessões')
      setLoggingOutAll(false)
    }
  }

  const otherSessions = sessions.filter((s) => s.token_id !== currentTokenId)

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sessões Ativas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie onde você está conectado
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSessions} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-4 w-4 text-primary" />
          <h2 className="font-medium text-sm">Este dispositivo</h2>
        </div>
        {loading ? (
          <Skeleton className="h-24 w-full rounded-lg" />
        ) : sessions.length > 0 ? (
          <SessionCard session={sessions[0]} isCurrent onRevoke={() => {}} />
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma sessão encontrada.</p>
        )}
      </div>

      {!loading && otherSessions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-sm">Outros dispositivos ({otherSessions.length})</h2>
          </div>
          <div className="space-y-3">
            {otherSessions.map((session) => (
              <SessionCard
                key={session.token_id}
                session={session}
                onRevoke={handleRevoke}
                revoking={revokingId === session.token_id}
              />
            ))}
          </div>
        </div>
      )}

      {!loading && otherSessions.length > 0 && (
        <div className="pt-2 border-t">
          <Button
            variant="outline"
            className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive gap-2"
            onClick={() => setShowLogoutAllDialog(true)}
          >
            <LogOut className="h-4 w-4" />
            Encerrar todas as outras sessões
          </Button>
        </div>
      )}

      <AlertDialog open={showLogoutAllDialog} onOpenChange={setShowLogoutAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar todas as sessões?</AlertDialogTitle>
            <AlertDialogDescription>
              Você será desconectado de todos os outros dispositivos. Sua sessão atual também será
              encerrada e você precisará fazer login novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleLogoutAll}
              disabled={loggingOutAll}
            >
              {loggingOutAll ? 'Encerrando...' : 'Sim, encerrar tudo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
