import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { usePermission } from '@/hooks/usePermission'
import { SessionCard } from './SessionCard'
import type { Session } from '@/types'

export default function AdminSessionsPage() {
  const canRead = usePermission('sessions:read')
  const canRevoke = usePermission('sessions:revoke')
  const [sessions, setSessions] = useState<Session[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null)
  const [revoking, setRevoking] = useState(false)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const data = await sessionsApi.listAll({ limit: 100 })
      setSessions(data.items)
      setTotal(data.total)
    } catch {
      toast.error('Erro ao carregar sessões')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canRead) fetchAll()
  }, [canRead])

  const filtered = sessions.filter(
    (s) =>
      !search ||
      s.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      s.ip_address?.includes(search)
  )

  const handleAdminRevoke = async () => {
    if (!confirmRevoke) return
    setRevoking(true)
    try {
      await sessionsApi.adminRevoke(confirmRevoke)
      toast.success('Sessão encerrada')
      setSessions((prev) => prev.filter((s) => s.token_id !== confirmRevoke))
      setTotal((prev) => prev - 1)
    } catch {
      toast.error('Erro ao encerrar sessão')
    } finally {
      setRevoking(false)
      setConfirmRevoke(null)
    }
  }

  if (!canRead) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Você não tem permissão para acessar esta tela.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sessões do Sistema</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} sessão{total !== 1 ? 'ões' : ''} ativa{total !== 1 ? 's' : ''} no total
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Filtrar por email ou IP..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))
        ) : filtered.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">
            {search ? 'Nenhuma sessão encontrada para este filtro.' : 'Nenhuma sessão ativa.'}
          </p>
        ) : (
          filtered.map((session) => (
            <SessionCard
              key={session.token_id}
              session={session}
              showEmail
              showRevokeButton={canRevoke}
              onRevoke={(tokenId) => canRevoke && setConfirmRevoke(tokenId)}
              revoking={false}
            />
          ))
        )}
      </div>

      <AlertDialog open={!!confirmRevoke} onOpenChange={(open) => !open && setConfirmRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar esta sessão?</AlertDialogTitle>
            <AlertDialogDescription>
              O usuário será desconectado imediatamente neste dispositivo. Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleAdminRevoke}
              disabled={revoking}
            >
              {revoking ? 'Encerrando...' : 'Encerrar sessão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
