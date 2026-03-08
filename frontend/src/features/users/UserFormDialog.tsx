import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
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
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { PasswordStrengthIndicator } from '@/components/shared/PasswordStrengthIndicator'
import { usersApi } from '@/api/users.api'
import { rolesApi } from '@/api/roles.api'
import type { UserProfile, Role, ApiError } from '@/types'

const specialCharRegex = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/

const createSchema = z.object({
  email: z.string().email('Email inválido'),
  full_name: z.string().min(2, 'Nome muito curto'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, '1 maiúscula')
    .regex(/[a-z]/, '1 minúscula')
    .regex(/\d/, '1 número')
    .regex(specialCharRegex, '1 caractere especial'),
  is_active: z.boolean(),
  role_ids: z.array(z.number()),
})

const editSchema = createSchema.extend({
  password: z
    .string()
    .optional()
    .refine(
      (v) =>
        !v ||
        (v.length >= 8 &&
          /[A-Z]/.test(v) &&
          /[a-z]/.test(v) &&
          /\d/.test(v) &&
          specialCharRegex.test(v)),
      'Senha não atende aos requisitos de segurança'
    ),
})

type CreateFormData = z.infer<typeof createSchema>
type EditFormData = z.infer<typeof editSchema>

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: UserProfile | null
  onSuccess: () => void
}

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: UserFormDialogProps) {
  const isEditing = Boolean(user)
  const [showPassword, setShowPassword] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])
  const [watchedPassword, setWatchedPassword] = useState('')

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateFormData | EditFormData>({
    resolver: zodResolver(isEditing ? editSchema : createSchema),
    defaultValues: {
      email: '',
      full_name: '',
      password: '',
      is_active: true,
      role_ids: [],
    },
  })

  // eslint-disable-next-line react-hooks/incompatible-library -- React Hook Form watch()
  const passwordValue = watch('password') as string
  useEffect(() => {
    setWatchedPassword(passwordValue || '')
  }, [passwordValue])

  // Carregar papéis disponíveis
  useEffect(() => {
    if (open) {
      rolesApi
        .list()
        .then(setRoles)
        .catch(() => {})
    }
  }, [open])

  // Preencher form ao editar
  useEffect(() => {
    if (!open) return

    if (user) {
      const roleIds =
        roles.length > 0
          ? roles.filter((r) => user.roles.includes(r.name)).map((r) => r.id)
          : []
      reset({
        email: user.email,
        full_name: user.full_name,
        password: '',
        is_active: user.is_active,
        role_ids: roleIds,
      })
    } else {
      reset({
        email: '',
        full_name: '',
        password: '',
        is_active: true,
        role_ids: [],
      })
    }
    setWatchedPassword('')
  }, [user, reset, open, roles])

  const onSubmit = async (data: CreateFormData | EditFormData) => {
    try {
      if (isEditing && user) {
        const payload = {
          full_name: data.full_name,
          is_active: data.is_active,
          role_ids: data.role_ids,
          ...(data.password ? { password: data.password } : {}),
        }
        await usersApi.update(user.id, payload)
        toast.success('Usuário atualizado com sucesso')
      } else {
        await usersApi.create(data as CreateFormData)
        toast.success('Usuário criado com sucesso')
      }
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      const error = err as AxiosError<ApiError>
      const detail = error.response?.data?.detail
      if (
        typeof detail === 'string' &&
        detail.toLowerCase().includes('email')
      ) {
        setError('email', { message: 'Este email já está cadastrado' })
      } else {
        toast.error(
          typeof detail === 'string' ? detail : 'Ocorreu um erro. Tente novamente.'
        )
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize os dados do usuário.'
              : 'Preencha os dados para criar um novo usuário.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Nome */}
          <Input
            label="Nome Completo"
            placeholder="João da Silva"
            error={errors.full_name?.message}
            {...register('full_name')}
          />

          {/* Email — read-only na edição */}
          <Input
            label="Email"
            type="email"
            placeholder="joao@empresa.com"
            readOnly={isEditing}
            disabled={isEditing}
            error={errors.email?.message}
            {...register('email')}
          />

          {/* Senha */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Senha{' '}
              {isEditing && (
                <span className="text-muted-foreground">
                  (deixe em branco para manter)
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={
                  isEditing ? '••••••••' : 'Mínimo 8 caracteres'
                }
                className={[
                  'flex h-9 w-full rounded-md border bg-surface px-3 py-1 pr-10 text-sm shadow-sm transition-colors',
                  'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  errors.password
                    ? 'border-danger focus-visible:ring-danger'
                    : 'border-input',
                ].join(' ')}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-danger">{errors.password.message}</p>
            )}
            {watchedPassword && (
              <PasswordStrengthIndicator password={watchedPassword} />
            )}
          </div>

          {/* Status */}
          <div className="flex items-center gap-3">
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <Switch
                  id="is_active"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <label
              htmlFor="is_active"
              className="text-sm font-medium cursor-pointer"
            >
              Conta ativa
            </label>
          </div>

          {/* Papéis */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Papéis</label>
            <Controller
              name="role_ids"
              control={control}
              render={({ field }) => (
                <div className="flex flex-wrap gap-2 p-3 border border-input rounded-md min-h-[44px]">
                  {roles.length === 0 && (
                    <span className="text-xs text-muted-foreground">
                      Carregando papéis...
                    </span>
                  )}
                  {roles.map((role) => {
                    const selected = (field.value as number[]).includes(
                      role.id
                    )
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => {
                          const current = field.value as number[]
                          field.onChange(
                            selected
                              ? current.filter((id) => id !== role.id)
                              : [...current, role.id]
                          )
                        }}
                        className="focus:outline-none"
                      >
                        <Badge
                          variant={selected ? 'default' : 'outline'}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          {role.name}
                        </Badge>
                      </button>
                    )
                  })}
                </div>
              )}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEditing ? 'Salvar Alterações' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
