import { useEffect } from 'react'
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
import { permissionsApi } from '@/api/permissions.api'
import type { Permission, ApiError } from '@/types'

const schema = z.object({
  name: z
    .string()
    .min(3, 'Nome muito curto')
    .regex(
      /^[a-z]+:[a-z]+$/,
      'Formato inválido. Use: recurso:ação (ex: users:read)'
    ),
  description: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface PermissionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  permission?: Permission | null
  onSuccess: () => void
}

export function PermissionFormDialog({
  open,
  onOpenChange,
  permission,
  onSuccess,
}: PermissionFormDialogProps) {
  const isEditing = Boolean(permission)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (permission) {
      reset({
        name: permission.name,
        description: permission.description || '',
      })
    } else {
      reset({ name: '', description: '' })
    }
  }, [permission, reset, open])

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing && permission) {
        await permissionsApi.update(permission.id, data)
        toast.success('Permissão atualizada com sucesso')
      } else {
        await permissionsApi.create(data)
        toast.success('Permissão criada com sucesso')
      }
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      const error = err as AxiosError<ApiError>
      const detail = error.response?.data?.detail
      if (typeof detail === 'string' && detail.toLowerCase().includes('name')) {
        setError('name', { message: 'Esta permissão já existe' })
      } else {
        toast.error(
          typeof detail === 'string' ? detail : 'Ocorreu um erro. Tente novamente.'
        )
      }
    }
  }

  // Sugestões de autocomplete
  const SUGGESTIONS = [
    'users:create',
    'users:read',
    'users:update',
    'users:delete',
    'roles:create',
    'roles:read',
    'roles:update',
    'roles:delete',
    'permissions:create',
    'permissions:read',
    'permissions:update',
    'permissions:delete',
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Permissão' : 'Nova Permissão'}
          </DialogTitle>
          <DialogDescription>
            O nome da permissão deve seguir o formato{' '}
            <code className="text-xs bg-muted px-1 rounded">recurso:ação</code>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nome da Permissão</label>
            <input
              placeholder="ex: users:read"
              list="permission-suggestions"
              disabled={isEditing}
              className={[
                'flex h-9 w-full rounded-md border bg-surface px-3 py-1 text-sm shadow-sm transition-colors font-mono',
                'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:opacity-50',
                errors.name
                  ? 'border-danger focus-visible:ring-danger'
                  : 'border-input',
              ].join(' ')}
              {...register('name')}
            />
            <datalist id="permission-suggestions">
              {SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            {errors.name && (
              <p className="text-xs text-danger">{errors.name.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Formato:{' '}
              <code className="bg-muted px-1 rounded">recurso:ação</code> — use
              apenas letras minúsculas
            </p>
          </div>

          <Input
            label="Descrição (opcional)"
            placeholder="Descreva o que esta permissão permite..."
            error={errors.description?.message}
            {...register('description')}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEditing ? 'Salvar' : 'Criar Permissão'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
