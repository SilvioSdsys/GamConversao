import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, LogIn, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { AxiosError } from 'axios'
import type { ApiError } from '@/types'

const loginSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email é obrigatório'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuth()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data)
    } catch (err) {
      const error = err as AxiosError<ApiError>
      const status = error.response?.status

      if (status === 401) {
        setError('root', { message: 'Email ou senha incorretos' })
        return
      }

      if (status === 429) {
        setError('root', {
          message: 'Muitas tentativas de login. Aguarde 1 minuto e tente novamente.',
        })
        return
      }

      toast.error('Erro ao fazer login. Tente novamente.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[400px] animate-fade-in">

        {/* Logo / Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-lg">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-primary">
            {import.meta.env.VITE_APP_NAME || 'GamConversao'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Módulo de Segurança e Controle de Acesso
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg">Entrar na sua conta</CardTitle>
            <CardDescription>Informe suas credenciais para continuar</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <input
                  id="email"
                  type="email"
                  autoFocus
                  autoComplete="email"
                  placeholder="seu@email.com"
                  disabled={isSubmitting}
                  className={[
                    'flex h-9 w-full rounded-md border bg-surface px-3 py-1 text-sm shadow-sm transition-colors',
                    'placeholder:text-muted-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    'disabled:opacity-50',
                    errors.email ? 'border-danger focus-visible:ring-danger' : 'border-input',
                  ].join(' ')}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-danger" role="alert">{errors.email.message}</p>
                )}
              </div>

              {/* Senha */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium">Senha</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    disabled={isSubmitting}
                    className={[
                      'flex h-9 w-full rounded-md border bg-surface px-3 py-1 pr-10 text-sm shadow-sm transition-colors',
                      'placeholder:text-muted-foreground',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      'disabled:opacity-50',
                      errors.password ? 'border-danger focus-visible:ring-danger' : 'border-input',
                    ].join(' ')}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-danger" role="alert">{errors.password.message}</p>
                )}
              </div>

              {/* Erro global */}
              {errors.root && (
                <div className="rounded-md bg-danger/10 border border-danger/20 px-3 py-2">
                  <p className="text-xs text-danger" role="alert">{errors.root.message}</p>
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                className="w-full"
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                <LogIn className="h-4 w-4" />
                {isSubmitting ? 'Entrando...' : 'Entrar'}
              </Button>

              {/* Link esqueci senha (placeholder) */}
              <div className="text-center">
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => toast.info('Funcionalidade disponível em breve.')}
                >
                  Esqueci minha senha
                </button>
              </div>

            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} GamConversao — Todos os direitos reservados
        </p>
      </div>
    </div>
  )
}
