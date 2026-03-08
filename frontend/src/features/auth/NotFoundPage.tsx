import { useNavigate } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/30">
        <SearchX className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Página não encontrada</h1>
      <p className="text-muted-foreground text-sm">
        A página que você procura não existe ou foi movida.
      </p>
      <Button onClick={() => navigate('/')}>Voltar ao início</Button>
    </div>
  )
}
