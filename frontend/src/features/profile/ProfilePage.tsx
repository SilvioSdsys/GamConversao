import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, User, Lock, ShieldCheck, LogOut, MonitorSmartphone } from 'lucide-react'
import { toast } from 'sonner'
import type { AxiosError } from 'axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, getInitials } from '@/components/ui/avatar'
import { PasswordStrengthIndicator } from '@/components/shared/PasswordStrengthIndicator'
import { useAuthStore } from '@/stores/authStore'
import { usersApi } from '@/api/users.api'
import { authApi } from '@/api/auth.api'
import { Link, useNavigate } from 'react-router-dom'
import type { ApiError } from '@/types'

// Schema: nome
const nameSchema = z.object({
  full_name: z.string().min(2, 'Nome muito curto').trim(),
})

// Schema: senha (regex sem escape desnecessário)
const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, '1 maiúscula')
      .regex(/[a-z]/, '1 minúscula')
      .regex(/\d/, '1 número')
      .regex(/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/, '1 especial'),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    path: ['confirm_password'],
    message: 'As senhas não coincidem',
  })

type NameFormData = z.infer<typeof nameSchema>
type PasswordFormData = z.infer<typeof passwordSchema>

export function ProfilePage() {
  const { user, setUser, logout: clearAuth, refreshToken } = useAuthStore()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // ── Form: nome ────────────────────────────────────────────────────────────
  const nameForm = useForm<NameFormData>({
    resolver: zodResolver(nameSchema),
    defaultValues: { full_name: user?.full_name || '' },
  })

  const onSaveName = async (data: NameFormData) => {
    try {
      const updated = await usersApi.updateMe({ full_name: data.full_name })
      setUser(updated)
      toast.success('Nome atualizado com sucesso')
    } catch {
      toast.error('Erro ao atualizar nome')
    }
  }

  // ── Form: senha ────────────────────────────────────────────────────────────
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '', confirm_password: '' },
  })

  const watchedPassword = passwordForm.watch('password')

  const onChangePassword = async (data: PasswordFormData) => {
    try {
      await usersApi.updateMe({ password: data.password })
      toast.success('Senha alterada com sucesso')
      passwordForm.reset()
    } catch (err) {
      const error = err as AxiosError<ApiError>
      const detail = error.response?.data?.detail
      toast.error(typeof detail === 'string' ? detail : 'Erro ao alterar senha')
    }
  }

  // ── Logout de todas as sessões ─────────────────────────────────────────────
  const handleLogoutAll = async () => {
    try {
      if (refreshToken) await authApi.logout(refreshToken)
    } catch {
      /* silent */
    }
    clearAuth()
    navigate('/login', { replace: true })
  }

  if (!user) return null

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      {/* Cabeçalho */}
      <div>
        <h2 className="text-xl font-semibold">Meu Perfil</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie suas informações pessoais e senha
        </p>
      </div>

      {/* Card: Informações pessoais */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="text-lg">{getInitials(user.full_name)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Informações Pessoais
              </CardTitle>
              <CardDescription>Atualize seu nome de exibição</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={nameForm.handleSubmit(onSaveName)} className="space-y-4" noValidate>
            <Input
              label="Nome Completo"
              error={nameForm.formState.errors.full_name?.message}
              {...nameForm.register('full_name')}
            />
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="mt-1 text-sm text-foreground bg-muted/20 rounded-md px-3 py-2 border border-input">
                {user.email}
              </p>
              <p className="text-xs text-muted-foreground mt-1">O email não pode ser alterado.</p>
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                loading={nameForm.formState.isSubmitting}
                size="sm"
              >
                Salvar Alterações
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Card: Alterar senha */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Alterar Senha
          </CardTitle>
          <CardDescription>
            Escolha uma senha forte com pelo menos 8 caracteres
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={passwordForm.handleSubmit(onChangePassword)}
            className="space-y-4"
            noValidate
          >
            {/* Nova senha */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nova Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  className={[
                    'flex h-9 w-full rounded-md border bg-surface px-3 py-1 pr-10 text-sm shadow-sm transition-colors',
                    'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    passwordForm.formState.errors.password
                      ? 'border-danger focus-visible:ring-danger'
                      : 'border-input',
                  ].join(' ')}
                  {...passwordForm.register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordForm.formState.errors.password && (
                <p className="text-xs text-danger">
                  {passwordForm.formState.errors.password.message}
                </p>
              )}
              {watchedPassword && <PasswordStrengthIndicator password={watchedPassword} />}
            </div>

            {/* Confirmar senha */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Confirmar Senha</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repita a nova senha"
                  className={[
                    'flex h-9 w-full rounded-md border bg-surface px-3 py-1 pr-10 text-sm shadow-sm transition-colors',
                    'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    passwordForm.formState.errors.confirm_password
                      ? 'border-danger focus-visible:ring-danger'
                      : 'border-input',
                  ].join(' ')}
                  {...passwordForm.register('confirm_password')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordForm.formState.errors.confirm_password && (
                <p className="text-xs text-danger">
                  {passwordForm.formState.errors.confirm_password.message}
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                loading={passwordForm.formState.isSubmitting}
                size="sm"
              >
                Alterar Senha
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Card: Sessão atual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Sessão e Permissões
          </CardTitle>
          <CardDescription>Papéis e permissões da sua conta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Papéis
            </p>
            <div className="flex flex-wrap gap-2">
              {user.roles.length === 0 ? (
                <span className="text-sm text-muted-foreground">Nenhum papel atribuído</span>
              ) : (
                user.roles.map((r) => (
                  <Badge key={r} variant="default">
                    {r}
                  </Badge>
                ))
              )}
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Permissões ({user.permissions.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {user.permissions.length === 0 ? (
                <span className="text-sm text-muted-foreground">Nenhuma permissão</span>
              ) : (
                user.permissions.map((p) => (
                  <code
                    key={p}
                    className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono"
                  >
                    {p}
                  </code>
                ))
              )}
            </div>
          </div>

          <Separator />

          <div className="pt-4 border-t">
            <Button variant="outline" size="sm" asChild>
              <Link to="/sessions" className="gap-2">
                <MonitorSmartphone className="h-4 w-4" />
                Gerenciar Sessões Ativas
              </Link>
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Encerrar sessão</p>
              <p className="text-xs text-muted-foreground">Sair de todos os dispositivos</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogoutAll}>
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
