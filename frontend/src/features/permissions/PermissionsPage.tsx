import { useCallback, useEffect, useMemo, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { MoreHorizontal, PlusCircle, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable } from '@/components/shared/DataTable'
import { PermissionFormDialog } from './PermissionFormDialog'
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
import { permissionsApi } from '@/api/permissions.api'
import { rolesApi } from '@/api/roles.api'
import {
  getResourceLabel,
  getActionFromPermission,
} from '@/utils/permissions'
import type { Permission, Role } from '@/types'
import type { ColumnDef } from '@tanstack/react-table'

const colHelper = createColumnHelper<Permission>()

export function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [resourceFilter, setResourceFilter] = useState<string>('all')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editingPermission, setEditingPermission] =
    useState<Permission | null>(null)
  const [deletingPermission, setDeletingPermission] =
    useState<Permission | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const canCreate = usePermission('permissions:create')
  const canUpdate = usePermission('permissions:update')
  const canDelete = usePermission('permissions:delete')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [perms, roleList] = await Promise.all([
        permissionsApi.list(),
        rolesApi.list(),
      ])
      setPermissions(perms)
      setRoles(roleList)
    } catch {
      toast.error('Erro ao carregar permissões')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Opções únicas de recursos e ações para os filtros
  const { resources, actions } = useMemo(() => {
    const res = new Set<string>()
    const act = new Set<string>()
    permissions.forEach((p) => {
      const [r, a] = p.name.split(':')
      if (r) res.add(r)
      if (a) act.add(a)
    })
    return { resources: [...res].sort(), actions: [...act].sort() }
  }, [permissions])

  // Filtrar dados
  const filteredPermissions = useMemo(() => {
    return permissions.filter((p) => {
      const [resource, action] = p.name.split(':')
      if (resourceFilter !== 'all' && resource !== resourceFilter) return false
      if (actionFilter !== 'all' && action !== actionFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !p.name.toLowerCase().includes(q) &&
          !(p.description || '').toLowerCase().includes(q)
        )
          return false
      }
      return true
    })
  }, [permissions, search, resourceFilter, actionFilter])

  const handleDelete = async () => {
    if (!deletingPermission) return
    setIsDeleting(true)
    try {
      await permissionsApi.delete(deletingPermission.id)
      toast.success(`Permissão "${deletingPermission.name}" removida`)
      setDeletingPermission(null)
      await loadData()
    } catch {
      toast.error('Não foi possível remover. A permissão pode estar em uso.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Mapear quais papéis têm cada permissão
  const rolesByPermission = useMemo(() => {
    const map: Record<number, string[]> = {}
    roles.forEach((role) => {
      ;(role.permissions || []).forEach((p) => {
        if (!map[p.id]) map[p.id] = []
        map[p.id].push(role.name)
      })
    })
    return map
  }, [roles])

  const columns: ColumnDef<Permission, any>[] = [
    colHelper.accessor('name', {
      header: 'Permissão',
      cell: (info) => {
        const [resource] = info.getValue().split(':')
        return (
          <div>
            <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">
              {info.getValue()}
            </code>
            <p className="text-xs text-muted-foreground mt-0.5">
              {getResourceLabel(resource)} →{' '}
              {getActionFromPermission(info.getValue())}
            </p>
          </div>
        )
      },
    }),
    colHelper.accessor('description', {
      header: 'Descrição',
      cell: (info) => (
        <span className="text-sm text-muted-foreground">
          {info.getValue() || '—'}
        </span>
      ),
    }),
    colHelper.display({
      id: 'roles',
      header: 'Papéis',
      cell: ({ row }) => {
        const permRoles = rolesByPermission[row.original.id] || []
        return (
          <div className="flex flex-wrap gap-1">
            {permRoles.length === 0 ? (
              <span className="text-xs text-muted-foreground">—</span>
            ) : (
              permRoles.map((r) => (
                <Badge key={r} variant="blue" className="text-xs">
                  {r}
                </Badge>
              ))
            )}
          </div>
        )
      },
      enableSorting: false,
    }),
    colHelper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const perm = row.original
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
                    setEditingPermission(perm)
                    setFormOpen(true)
                  }}
                >
                  <Pencil className="h-4 w-4" /> Editar
                </DropdownMenuItem>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    danger
                    onClick={() => setDeletingPermission(perm)}
                  >
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

  const toolbar = (
    <>
      {/* Filtro por recurso */}
      <select
        value={resourceFilter}
        onChange={(e) => setResourceFilter(e.target.value)}
        className="h-9 rounded-md border border-input bg-surface px-2 text-sm"
      >
        <option value="all">Todos os recursos</option>
        {resources.map((r) => (
          <option key={r} value={r}>
            {getResourceLabel(r)}
          </option>
        ))}
      </select>

      {/* Filtro por ação */}
      <select
        value={actionFilter}
        onChange={(e) => setActionFilter(e.target.value)}
        className="h-9 rounded-md border border-input bg-surface px-2 text-sm"
      >
        <option value="all">Todas as ações</option>
        {actions.map((a) => (
          <option key={a} value={a}>
            {getActionFromPermission(`x:${a}`)}
          </option>
        ))}
      </select>

      {canCreate && (
        <Button
          onClick={() => {
            setEditingPermission(null)
            setFormOpen(true)
          }}
        >
          <PlusCircle className="h-4 w-4" /> Nova Permissão
        </Button>
      )}
    </>
  )

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Permissões</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie as permissões do sistema
          </p>
        </div>
      </div>

      <DataTable
        columns={columns as ColumnDef<Permission, unknown>[]}
        data={filteredPermissions}
        isLoading={isLoading}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar permissão..."
        toolbar={toolbar}
        emptyMessage="Nenhuma permissão encontrada."
      />

      <PermissionFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingPermission(null)
        }}
        permission={editingPermission}
        onSuccess={loadData}
      />

      <AlertDialog
        open={Boolean(deletingPermission)}
        onOpenChange={(o) => !o && setDeletingPermission(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover permissão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a permissão{' '}
              <code className="bg-muted px-1 rounded text-xs">
                {deletingPermission?.name}
              </code>
              ? Papéis que a possuem serão afetados.
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
