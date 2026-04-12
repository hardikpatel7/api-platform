import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RegisterPage from '@/app/(auth)/register/page'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  redirect: vi.fn(),
}))

const mockSignUp = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signUp: mockSignUp },
  }),
}))

beforeEach(() => {
  mockSignUp.mockReset()
  mockPush.mockReset()
})

describe('RegisterPage', () => {
  it('renders name, email, password fields and a sign-up button', () => {
    render(<RegisterPage />)
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign up|create account/i })).toBeInTheDocument()
  })

  it('shows a link back to the login page', () => {
    render(<RegisterPage />)
    expect(screen.getByRole('link', { name: /sign in|log in/i })).toBeInTheDocument()
  })

  it('calls signUp with email, password, and name metadata on submit', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: 'new-user-id' } }, error: null })
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByLabelText(/name/i), 'Alice')
    await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign up|create account/i }))

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'alice@example.com',
        password: 'password123',
        options: {
          data: { name: 'Alice' },
          emailRedirectTo: expect.stringContaining('/auth/callback'),
        },
      })
    })
  })

  it('redirects to home on successful sign-up when session is returned', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: 'new-uid' }, session: { access_token: 'tok' } }, error: null })
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByLabelText(/name/i), 'Bob')
    await user.type(screen.getByLabelText(/email/i), 'bob@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign up|create account/i }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('shows confirmation message when email confirmation is required (session is null)', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: 'new-uid' }, session: null }, error: null })
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByLabelText(/name/i), 'Carol')
    await user.type(screen.getByLabelText(/email/i), 'carol@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign up|create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument()
      expect(screen.getByText(/carol@example\.com/)).toBeInTheDocument()
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('does not redirect when sign-up fails', async () => {
    mockSignUp.mockResolvedValue({ data: null, error: { message: 'User already registered' } })
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByLabelText(/name/i), 'Alice')
    await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign up|create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/an account with this email already exists/i)).toBeInTheDocument()
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('displays an error message on failed sign-up', async () => {
    mockSignUp.mockResolvedValue({ data: null, error: { message: 'Email rate limit exceeded' } })
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByLabelText(/name/i), 'Alice')
    await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign up|create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/too many attempts/i)).toBeInTheDocument()
    })
  })
})
