import { useCallback, useEffect, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import {
  MoreHorizontal,
  PlusCircle,
  Pencil,
  Trash2,
  Power,
} from 'lucide-react'
import { toast } from 'sonner'
import { DataTable } from '@/components/shared/DataTable'
import { UserFormDialog } from './UserFormDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { usePermission } from '@/hooks/usePermission'
import { usersApi } from '@/api/users.api'
import type { UserProfile } from '@/types'

const colHelper = createColumnHelper<UserProfile>()

export function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const canCreate = usePermission('users:create')
  const canUpdate = usePermission('users:update')
  const canDelete = usePermission('users:delete')

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await usersApi.list()
      setUsers(data)
    } catch {
      toast.error('Erro ao carregar usuários')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleDelete = async () => {
    if (!deletingUser) return
    setIsDeleting(true)
    try {
      await usersApi.delete(deletingUser.id)
      toast.success(`Usuário "${deletingUser.full_name}" excluído`)
      setDeletingUser(null)
      await loadUsers()
    } catch {
      toast.error('Erro ao excluir usuário')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleActive = async (user: UserProfile) => {
    try {
      await usersApi.update(user.id, { is_active: !user.is_active })
      toast.success(
        `Usuário ${user.is_active ? 'desativado' : 'ativado'}`
      )
      await loadUsers()
    } catch {
      toast.error('Erro ao alterar status do usuário')
    }
  }

  const columns = [
    colHelper.accessor('id', {
      header: 'ID',
      cell: (info) => (
        <span className="text-muted-foreground text-xs">
          #{info.getValue()}
        </span>
      ),
      size: 60,
    }),
    colHelper.accessor('full_name', {
      header: 'Nome',
      cell: (info) => (
        <div>
          <p className="font-medium">{info.getValue()}</p>
          <p className="text-xs text-muted-foreground">
            {info.row.original.email}
          </p>
        </div>
      ),
    }),
    colHelper.accessor('is_active', {
      header: 'Status',
      cell: (info) => (
        <Badge variant={info.getValue() ? 'success' : 'danger'}>
          {info.getValue() ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    }),
    colHelper.accessor('roles', {
      header: 'Papéis',
      cell: (info) => (
        <div className="flex flex-wrap gap-1">
          {info.getValue().map((role) => (
            <Badge key={role} variant="blue" className="text-xs">
              {role}
            </Badge>
          ))}
          {info.getValue().length === 0 && (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      ),
      enableSorting: false,
    }),
    colHelper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const user = row.original
        if (!canUpdate && !canDelete) return null
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Ações</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canUpdate && (
                <DropdownMenuItem
                  onClick={() => {
                    setEditingUser(user)
                    setFormOpen(true)
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  Editar
                </DropdownMenuItem>
              )}
              {canUpdate && (
                <DropdownMenuItem
                  onClick={() => handleToggleActive(user)}
                >
                  <Power className="h-4 w-4" />
                  {user.is_active ? 'Desativar' : 'Ativar'}
                </DropdownMenuItem>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    danger
                    onClick={() => setDeletingUser(user)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    }),
  ]

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Cabeçalho da página */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Usuários</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os usuários do sistema
          </p>
        </div>
        {canCreate && (
          <Button
            onClick={() => {
              setEditingUser(null)
              setFormOpen(true)
            }}
          >
            <PlusCircle className="h-4 w-4" />
            Novo Usuário
          </Button>
        )}
      </div>

      {/* Tabela */}
      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nome ou email..."
        emptyMessage="Nenhum usuário encontrado."
      />

      {/* Dialog de criação/edição */}
      <UserFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingUser(null)
        }}
        user={editingUser}
        onSuccess={loadUsers}
      />

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog
        open={Boolean(deletingUser)}
        onOpenChange={(o) => !o && setDeletingUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir{' '}
              <strong>{deletingUser?.full_name}</strong>? Esta ação
              desativará a conta permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
