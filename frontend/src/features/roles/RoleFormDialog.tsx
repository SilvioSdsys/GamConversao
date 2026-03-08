import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import type { AxiosError } from 'axios'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PermissionGrid } from '@/components/shared/PermissionGrid'
import { rolesApi } from '@/api/roles.api'
import { permissionsApi } from '@/api/permissions.api'
import type { Role, Permission, ApiError } from '@/types'

const schema = z.object({
  name: z
    .string()
    .min(2, 'Nome muito curto')
    .regex(/^[a-z_]+$/, 'Use apenas letras minúsculas e underscore'),
  description: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface RoleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role?: Role | null
  onSuccess: () => void
}

export function RoleFormDialog({
  open,
  onOpenChange,
  role,
  onSuccess,
}: RoleFormDialogProps) {
  const isEditing = Boolean(role)
  const [allPermissions, setAllPermissions] = useState<Permission[]>([])
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([])

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  // Carregar todas as permissões disponíveis
  useEffect(() => {
    permissionsApi.list().then(setAllPermissions).catch(() => {})
  }, [])

  // Preencher form ao editar
  useEffect(() => {
    if (role) {
      reset({ name: role.name, description: role.description || '' })
    } else {
      reset({ name: '', description: '' })
    }
  }, [role, reset, open])

  useEffect(() => {
    const ids = role?.permissions?.map((p) => p.id) ?? []
    queueMicrotask(() => setSelectedPermissionIds(ids))
  }, [role, open])

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        permission_ids: selectedPermissionIds,
      }

      if (isEditing && role) {
        await rolesApi.update(role.id, payload)
        toast.success('Papel atualizado com sucesso')
      } else {
        await rolesApi.create(payload)
        toast.success('Papel criado com sucesso')
      }

      onSuccess()
      onOpenChange(false)
    } catch (err) {
      const error = err as AxiosError<ApiError>
      const detail = error.response?.data?.detail
      if (typeof detail === 'string' && detail.toLowerCase().includes('name')) {
        setError('name', { message: 'Este nome já está em uso' })
      } else {
        toast.error(
          typeof detail === 'string' ? detail : 'Ocorreu um erro. Tente novamente.'
        )
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Papel' : 'Novo Papel'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações e permissões do papel.'
              : 'Defina o nome e as permissões do novo papel.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label="Nome do Papel"
            placeholder="ex: operator"
            error={errors.name?.message}
            disabled={isEditing}
            {...register('name')}
          />
          {!isEditing && (
            <p className="text-xs text-muted-foreground -mt-2">
              Use letras minúsculas e underscore. Ex: admin, support_team
            </p>
          )}

          <Input
            label="Descrição (opcional)"
            placeholder="Descreva o papel..."
            error={errors.description?.message}
            {...register('description')}
          />

          <PermissionGrid
            allPermissions={allPermissions}
            selectedIds={selectedPermissionIds}
            onChange={setSelectedPermissionIds}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEditing ? 'Salvar Alterações' : 'Criar Papel'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
