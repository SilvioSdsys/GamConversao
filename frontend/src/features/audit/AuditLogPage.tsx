import { useCallback, useEffect, useState, Fragment } from 'react'
import { ChevronDown, ChevronRight, Download } from 'lucide-react'
import { toast } from 'sonner'
import { auditApi } from '@/api/audit.api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { usePermission } from '@/hooks/usePermission'
import type { AuditLog, AuditLogFilters } from '@/types'
import { formatDate } from '@/utils/format'

const PAGE_SIZE = 20
const RESOURCE_TYPES = ['user', 'role', 'permission', 'session', 'auth']

export function AuditLogPage() {
  const hasPermission = usePermission('audit:read')
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState<AuditLogFilters>({})

  const loadLogs = useCallback(async () => {
    if (!hasPermission) return
    setIsLoading(true)
    try {
      const res = await auditApi.list({
        ...filters,
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
      })
      setLogs(res.items)
      setTotal(res.total)
    } catch {
      toast.error('Erro ao carregar logs de auditoria')
    } finally {
      setIsLoading(false)
    }
  }, [hasPermission, filters, page])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const handleExport = async () => {
    if (!hasPermission) return
    setIsExporting(true)
    try {
      const blob = await auditApi.exportCsv(filters)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'audit_logs.csv'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Exportação concluída')
    } catch {
      toast.error('Erro ao exportar CSV')
    } finally {
      setIsExporting(false)
    }
  }

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const updateFilter = <K extends keyof AuditLogFilters>(
    key: K,
    value: AuditLogFilters[K]
  ) => {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(0)
  }

  if (!hasPermission) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div>
          <h2 className="text-xl font-semibold">Log de Auditoria</h2>
          <p className="text-sm text-muted-foreground">
            Você não tem permissão para visualizar os logs de auditoria.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Log de Auditoria</h2>
          <p className="text-sm text-muted-foreground">
            Histórico de ações realizadas no sistema
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={isExporting}
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="w-48">
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Email
              </label>
              <Input
                placeholder="Buscar por email..."
                value={filters.user_email ?? ''}
                onChange={(e) => updateFilter('user_email', e.target.value || undefined)}
              />
            </div>
            <div className="w-36">
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Recurso
              </label>
              <Select
                value={filters.resource_type || 'all'}
                onValueChange={(v) =>
                  updateFilter('resource_type', v === 'all' ? undefined : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {RESOURCE_TYPES.map((rt) => (
                    <SelectItem key={rt} value={rt}>
                      {rt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-36">
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Resultado
              </label>
              <Select
                value={filters.result || 'all'}
                onValueChange={(v) =>
                  updateFilter('result', v === 'all' ? undefined : (v as 'success' | 'failure'))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="success">Sucesso</SelectItem>
                  <SelectItem value="failure">Falha</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-36">
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                De (data)
              </label>
              <Input
                type="date"
                value={filters.date_from ?? ''}
                onChange={(e) =>
                  updateFilter('date_from', e.target.value || undefined)
                }
              />
            </div>
            <div className="w-36">
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Até (data)
              </label>
              <Input
                type="date"
                value={filters.date_to ?? ''}
                onChange={(e) =>
                  updateFilter('date_to', e.target.value || undefined)
                }
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setFilters({})
                setPage(0)
              }}
            >
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Recurso</TableHead>
                  <TableHead>Resultado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-4" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhum log encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <Fragment key={log.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleExpand(log.id)}
                      >
                        <TableCell className="w-10">
                          {expandedIds.has(log.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          #{log.id}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(log.created_at)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.user_email ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm">{log.action}</TableCell>
                        <TableCell className="text-sm">
                          {log.resource_type ?? '—'}
                          {log.resource_id && ` #${log.resource_id}`}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              log.result === 'success' ? 'success' : 'danger'
                            }
                          >
                            {log.result === 'success' ? 'Sucesso' : 'Falha'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      {expandedIds.has(log.id) && (
                        <TableRow className="bg-muted/20">
                          <TableCell colSpan={7} className="py-3">
                            <div className="space-y-2 text-sm pl-6">
                              {log.detail && (
                                <p>
                                  <span className="font-medium text-muted-foreground">
                                    Detalhe:
                                  </span>{' '}
                                  {log.detail}
                                </p>
                              )}
                              {log.ip_address && (
                                <p>
                                  <span className="font-medium text-muted-foreground">
                                    IP:
                                  </span>{' '}
                                  {log.ip_address}
                                </p>
                              )}
                              {log.changes && (
                                <div>
                                  <span className="font-medium text-muted-foreground">
                                    Alterações:
                                  </span>
                                  <pre className="mt-1 p-2 rounded bg-muted/50 text-xs overflow-x-auto">
                                    {JSON.stringify(log.changes, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {!log.detail &&
                                !log.ip_address &&
                                !log.changes && (
                                  <p className="text-muted-foreground">
                                    Sem detalhes adicionais
                                  </p>
                                )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!isLoading && logs.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
              <span>
                {total} resultado(s) • Página {page + 1} de{' '}
                {Math.ceil(total / PAGE_SIZE) || 1}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((p) =>
                      Math.min(Math.ceil(total / PAGE_SIZE) - 1, p + 1)
                    )
                  }
                  disabled={page >= Math.ceil(total / PAGE_SIZE) - 1}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
