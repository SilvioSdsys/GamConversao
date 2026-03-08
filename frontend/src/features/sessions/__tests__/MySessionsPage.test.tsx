import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MySessionsPage from '../MySessionsPage'
import { sessionsApi } from '@/api/sessions.api'

vi.mock('@/api/sessions.api')
vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ logout: vi.fn(), accessToken: 'mock-token' }),
}))

const mockSessions = {
  items: [
    {
      token_id: 'abc-123',
      user_id: 1,
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0)',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 86400_000).toISOString(),
    },
    {
      token_id: 'def-456',
      user_id: 1,
      ip_address: '10.0.0.5',
      user_agent: 'Mozilla/5.0 (iPhone)',
      created_at: new Date(Date.now() - 3600_000).toISOString(),
      expires_at: new Date(Date.now() + 6 * 86400_000).toISOString(),
    },
  ],
  total: 2,
}

describe('MySessionsPage', () => {
  beforeEach(() => {
    vi.mocked(sessionsApi.listMy).mockResolvedValue(mockSessions as never)
  })

  it('exibe sessões do usuário', async () => {
    render(
      <MemoryRouter>
        <MySessionsPage />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(screen.getByText(/192\.168\.1\.1/)).toBeInTheDocument()
    })
  })

  it('identifica sessão atual como a primeira', async () => {
    render(
      <MemoryRouter>
        <MySessionsPage />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(screen.getByText('Sessão atual')).toBeInTheDocument()
    })
  })

  it('exibe botão de encerrar outras sessões', async () => {
    render(
      <MemoryRouter>
        <MySessionsPage />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(screen.getByText(/Encerrar todas as outras sessões/)).toBeInTheDocument()
    })
  })
})
