import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MapPin, Clock, Trash2, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { Session } from '@/types'
import { parseDeviceFromUA, parseBrowserFromUA } from '@/utils/device'

interface SessionCardProps {
  session: Session
  isCurrent?: boolean
  onRevoke: (tokenId: string) => void
  revoking?: boolean
  showEmail?: boolean
  showRevokeButton?: boolean
}

export function SessionCard({
  session,
  isCurrent,
  onRevoke,
  revoking,
  showEmail,
  showRevokeButton = true,
}: SessionCardProps) {
  const device = parseDeviceFromUA(session.user_agent)
  const browser = parseBrowserFromUA(session.user_agent)
  const createdAgo = formatDistanceToNow(new Date(session.created_at), {
    addSuffix: true,
    locale: ptBR,
  })
  const expiresAt = format(new Date(session.expires_at), "dd/MM/yy 'às' HH:mm", {
    locale: ptBR,
  })

  return (
    <Card className={`transition-all ${isCurrent ? 'border-primary/50 bg-primary/5' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="text-2xl mt-0.5 select-none" aria-hidden>
              {device.split(' ')[0]}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{device.replace(/^[^\s]+\s/, '')}</span>
                {browser && (
                  <span className="text-xs text-muted-foreground">• {browser}</span>
                )}
                {isCurrent && (
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/10 text-xs gap-1">
                    <Star className="h-2.5 w-2.5 fill-current" /> Sessão atual
                  </Badge>
                )}
              </div>

              {showEmail && session.user_email && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {session.user_email}
                </p>
              )}

              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                {session.ip_address && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {session.ip_address}
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> Aberta {createdAgo}
                </span>
                <span className="text-xs text-muted-foreground">Expira {expiresAt}</span>
              </div>
            </div>
          </div>

          {!isCurrent && showRevokeButton && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
              onClick={() => onRevoke(session.token_id)}
              disabled={revoking}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Encerrar sessão</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
