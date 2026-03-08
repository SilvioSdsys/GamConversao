import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { LoginPage } from '../LoginPage'

// Mock do hook useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    login: vi.fn().mockResolvedValue(undefined),
    user: null,
    isAuthenticated: false,
    isLoading: false,
  }),
}))

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )
}

describe('LoginPage', () => {
  it('renderiza campos de email e senha', () => {
    renderLogin()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
  })

  it('exibe erros de validação quando submete vazio', async () => {
    renderLogin()
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))
    await waitFor(() => {
      expect(screen.getByText(/email inválido/i)).toBeInTheDocument()
    })
  })

  it('exibe/oculta senha ao clicar no botão', async () => {
    renderLogin()
    const passwordInput = screen.getByLabelText('Senha')
    expect(passwordInput).toHaveAttribute('type', 'password')

    await userEvent.click(screen.getByRole('button', { name: /mostrar senha/i }))
    expect(passwordInput).toHaveAttribute('type', 'text')
  })
})
