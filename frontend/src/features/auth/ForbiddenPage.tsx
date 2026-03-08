import { useNavigate } from 'react-router-dom'
import { ShieldX } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ForbiddenPage() {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-danger/10">
        <ShieldX className="h-8 w-8 text-danger" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Acesso Negado</h1>
      <p className="text-muted-foreground text-sm max-w-sm text-center">
        Você não tem permissão para acessar esta página.
        Entre em contato com o administrador do sistema.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
        <Button onClick={() => navigate('/')}>Ir para o início</Button>
      </div>
    </div>
  )
}
