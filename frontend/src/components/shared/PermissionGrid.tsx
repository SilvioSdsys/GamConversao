import { useMemo } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  groupPermissionsByResource,
  getResourceLabel,
  getActionFromPermission,
} from '@/utils/permissions'
import type { Permission } from '@/types'

interface PermissionGridProps {
  allPermissions: Permission[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
  disabled?: boolean
}

export function PermissionGrid({
  allPermissions,
  selectedIds,
  onChange,
  disabled = false,
}: PermissionGridProps) {
  const groups = useMemo(
    () => groupPermissionsByResource(allPermissions),
    [allPermissions]
  )

  const toggle = (id: number) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((sid) => sid !== id)
        : [...selectedIds, id]
    )
  }

  const toggleGroup = (groupPermissions: Permission[]) => {
    const groupIds = groupPermissions.map((p) => p.id)
    const allSelected = groupIds.every((id) => selectedIds.includes(id))

    if (allSelected) {
      onChange(selectedIds.filter((id) => !groupIds.includes(id)))
    } else {
      const newIds = [...new Set([...selectedIds, ...groupIds])]
      onChange(newIds)
    }
  }

  const totalSelected = selectedIds.length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Permissões</p>
        <Badge variant={totalSelected > 0 ? 'default' : 'outline'} className="text-xs">
          {totalSelected} selecionada{totalSelected !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {groups.map(({ resource, permissions }) => {
          const groupIds = permissions.map((p) => p.id)
          const allGroupSelected = groupIds.every((id) => selectedIds.includes(id))
          const someGroupSelected = groupIds.some((id) => selectedIds.includes(id))

          return (
            <div
              key={resource}
              className="rounded-md border border-border overflow-hidden"
            >
              {/* Header do grupo */}
              <div className="flex items-center gap-2 bg-muted/20 px-3 py-2 border-b border-border">
                <Checkbox
                  id={`group-${resource}`}
                  checked={
                    allGroupSelected
                      ? true
                      : someGroupSelected
                        ? 'indeterminate'
                        : false
                  }
                  onCheckedChange={() => toggleGroup(permissions)}
                  disabled={disabled}
                />
                <label
                  htmlFor={`group-${resource}`}
                  className="text-xs font-semibold text-foreground uppercase tracking-wide cursor-pointer"
                >
                  {getResourceLabel(resource)}
                </label>
                <span className="ml-auto text-xs text-muted-foreground">
                  {groupIds.filter((id) => selectedIds.includes(id)).length}/
                  {groupIds.length}
                </span>
              </div>

              {/* Permissões do grupo */}
              <div className="grid grid-cols-2 gap-0 divide-y divide-border">
                {permissions.map((perm) => (
                  <label
                    key={perm.id}
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/10 transition-colors"
                  >
                    <Checkbox
                      checked={selectedIds.includes(perm.id)}
                      onCheckedChange={() => toggle(perm.id)}
                      disabled={disabled}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium">
                        {getActionFromPermission(perm.name)}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {perm.name}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )
        })}

        {groups.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma permissão disponível.
          </p>
        )}
      </div>
    </div>
  )
}
