import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuditLogPage } from '../AuditLogPage'

const mockList = vi.fn()
const mockExportCsv = vi.fn()
const mockUsePermission = vi.fn((permission: string) => permission === 'audit:read')

vi.mock('@/api/audit.api', () => ({
  auditApi: {
    list: (...args: unknown[]) => mockList(...args),
    exportCsv: (...args: unknown[]) => mockExportCsv(...args),
  },
}))

vi.mock('@/hooks/usePermission', () => ({
  usePermission: (permission: string) => mockUsePermission(permission),
}))

const mockLogs = [
  {
    id: 1,
    user_id: 10,
    user_email: 'admin@test.com',
    action: 'login',
    resource_type: 'auth',
    resource_id: null,
    result: 'success' as const,
    ip_address: '127.0.0.1',
    user_agent: null,
    changes: null,
    detail: 'Login realizado',
    created_at: '2025-03-07T10:00:00Z',
  },
  {
    id: 2,
    user_id: 11,
    user_email: 'user@test.com',
    action: 'create',
    resource_type: 'user',
    resource_id: '42',
    result: 'failure' as const,
    ip_address: null,
    user_agent: null,
    changes: { before: {}, after: { email: 'new@test.com' } },
    detail: null,
    created_at: '2025-03-07T11:00:00Z',
  },
]

describe('AuditLogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockList.mockResolvedValue({
      items: mockLogs,
      total: 2,
      skip: 0,
      limit: 20,
    })
    mockExportCsv.mockResolvedValue(new Blob(['id,created_at\n1,2025-03-07']))
    mockUsePermission.mockImplementation((p: string) => p === 'audit:read')
  })

  it('exibe mensagem de negação quando sem permissão audit:read', async () => {
    mockUsePermission.mockReturnValue(false)

    render(
      <MemoryRouter>
        <AuditLogPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(
        screen.getByText(/não tem permissão para visualizar/i)
      ).toBeInTheDocument()
    })
    expect(mockList).not.toHaveBeenCalled()
  })

  it('exibe logs e badges de resultado', async () => {
    render(
      <MemoryRouter>
        <AuditLogPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mockList).toHaveBeenCalled()
    })

    expect(screen.getByText((content) => content.includes('admin@test.com'))).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes('user@test.com'))).toBeInTheDocument()
    expect(screen.getByText('Sucesso')).toBeInTheDocument()
    expect(screen.getByText('Falha')).toBeInTheDocument()
  })

  it('chama exportCsv ao clicar em Exportar CSV', async () => {
    render(
      <MemoryRouter>
        <AuditLogPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mockList).toHaveBeenCalled()
    })

    const exportBtn = screen.getByRole('button', { name: /exportar csv/i })
    await userEvent.click(exportBtn)

    await waitFor(() => {
      expect(mockExportCsv).toHaveBeenCalled()
    })
  })
})
