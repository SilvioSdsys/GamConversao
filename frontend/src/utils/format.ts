import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatDate(dateString: string): string {
  try {
    return format(parseISO(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  } catch {
    return dateString
  }
}

export function formatDateShort(dateString: string): string {
  try {
    return format(parseISO(dateString), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return dateString
  }
}
