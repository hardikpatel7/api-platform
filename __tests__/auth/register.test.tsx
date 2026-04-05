import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RegisterPage from '@/app/(auth)/register/page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  redirect: vi.fn(),
}))

const mockSignUp = vi.fn()
const mockInsert = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signUp: mockSignUp,
    },
    from: () => ({
      insert: mockInsert,
    }),
  }),
}))

describe('RegisterPage', () => {
  beforeEach(() => {
    mockSignUp.mockReset()
    mockInsert.mockReset()
  })

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

  it('calls signUp and inserts user row on submit', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: 'new-user-id' } }, error: null })
    mockInsert.mockResolvedValue({ error: null })
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
      })
    })
  })

  it('displays an error message on failed sign-up', async () => {
    mockSignUp.mockResolvedValue({ data: null, error: { message: 'Email already in use' } })
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByLabelText(/name/i), 'Alice')
    await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign up|create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/email already in use/i)).toBeInTheDocument()
    })
  })
})
