import { useCallback, useEffect, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { MoreHorizontal, PlusCircle, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable } from '@/components/shared/DataTable'
import { RoleFormDialog } from './RoleFormDialog'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { usePermission } from '@/hooks/usePermission'
import { rolesApi } from '@/api/roles.api'
import type { Permission, Role } from '@/types'
import type { ColumnDef } from '@tanstack/react-table'

const colHelper = createColumnHelper<Role>()

export function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [deletingRole, setDeletingRole] = useState<Role | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const canCreate = usePermission('roles:create')
  const canUpdate = usePermission('roles:update')
  const canDelete = usePermission('roles:delete')

  const loadRoles = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await rolesApi.list()
      setRoles(data)
    } catch {
      toast.error('Erro ao carregar papéis')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRoles()
  }, [loadRoles])

  const handleDelete = async () => {
    if (!deletingRole) return
    setIsDeleting(true)
    try {
      await rolesApi.delete(deletingRole.id)
      toast.success(`Papel "${deletingRole.name}" removido`)
      setDeletingRole(null)
      await loadRoles()
    } catch {
      toast.error('Não foi possível remover o papel. Ele pode estar em uso.')
    } finally {
      setIsDeleting(false)
    }
  }

  const columns: ColumnDef<Role, any>[] = [
    colHelper.accessor('id', {
      header: 'ID',
      cell: (info) => (
        <span className="text-muted-foreground text-xs">#{info.getValue()}</span>
      ),
    }),
    colHelper.accessor('name', {
      header: 'Nome',
      cell: (info) => (
        <div>
          <p className="font-medium">{info.getValue()}</p>
          {info.row.original.description && (
            <p className="text-xs text-muted-foreground">
              {info.row.original.description}
            </p>
          )}
        </div>
      ),
    }),
    colHelper.accessor('permissions', {
      header: 'Permissões',
      cell: (info) => {
        const perms = info.getValue() || []
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="cursor-default">
                  {perms.length} permissão{perms.length !== 1 ? 'ões' : ''}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <div className="space-y-0.5">
                  {perms.length === 0 ? (
                    <p className="text-xs">Nenhuma permissão atribuída</p>
                  ) : (
                    perms.map((p: Permission) => (
                      <p key={p.id} className="text-xs">
                        {p.name}
                      </p>
                    ))
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
      enableSorting: false,
    }),
    colHelper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const role = row.original
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
                    setEditingRole(role)
                    setFormOpen(true)
                  }}
                >
                  <Pencil className="h-4 w-4" /> Editar
                </DropdownMenuItem>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem danger onClick={() => setDeletingRole(role)}>
                    <Trash2 className="h-4 w-4" /> Remover
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Papéis</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os papéis e suas permissões
          </p>
        </div>
        {canCreate && (
          <Button
            onClick={() => {
              setEditingRole(null)
              setFormOpen(true)
            }}
          >
            <PlusCircle className="h-4 w-4" /> Novo Papel
          </Button>
        )}
      </div>

      <DataTable
        columns={columns as ColumnDef<Role, unknown>[]}
        data={roles}
        isLoading={isLoading}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nome..."
        emptyMessage="Nenhum papel encontrado."
      />

      <RoleFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingRole(null)
        }}
        role={editingRole}
        onSuccess={loadRoles}
      />

      <AlertDialog
        open={Boolean(deletingRole)}
        onOpenChange={(o) => !o && setDeletingRole(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover papel</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o papel{' '}
              <strong>{deletingRole?.name}</strong>? Usuários com este papel
              perderão as permissões associadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
