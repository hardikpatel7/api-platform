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
const mockSingle = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signUp: mockSignUp },
    from: mockFrom,
  }),
}))

beforeEach(() => {
  mockSignUp.mockReset()
  mockInsert.mockReset()
  mockSingle.mockReset()

  // Default: no pre-registered slot found
  mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
  mockInsert.mockResolvedValue({ error: null })

  vi.mocked(mockFrom).mockImplementation(() => ({
    select: () => ({
      eq: () => ({
        neq: () => ({ single: mockSingle }),
      }),
    }),
    insert: mockInsert,
    delete: () => ({
      eq: () => ({
        neq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  }))
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

  it('calls signUp and inserts user row on submit', async () => {
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
      })
    })
  })

  it('inserts with viewer role when no pre-registered slot exists', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: 'new-uid' } }, error: null })
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByLabelText(/name/i), 'Bob')
    await user.type(screen.getByLabelText(/email/i), 'bob@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign up|create account/i }))

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'new-uid', email: 'bob@example.com', role: 'viewer' })
      )
    })
  })

  it('adopts pre-registered role when email matches an existing slot', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: 'new-uid' } }, error: null })
    // Pre-registered slot found with editor role
    mockSingle.mockResolvedValue({ data: { role: 'editor' }, error: null })

    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByLabelText(/name/i), 'Alice')
    await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign up|create account/i }))

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'new-uid', email: 'alice@example.com', role: 'editor' })
      )
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
