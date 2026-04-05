import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Header } from '@/components/layout/Header'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

const mockSignOut = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signOut: mockSignOut },
  }),
}))

describe('Header', () => {
  it('renders the app name', () => {
    render(<Header userName="Alice" />)
    expect(screen.getByText(/api platform/i)).toBeInTheDocument()
  })

  it('renders the user name', () => {
    render(<Header userName="Alice" />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('calls signOut when sign-out button is clicked', async () => {
    mockSignOut.mockResolvedValue({ error: null })
    const user = userEvent.setup()
    render(<Header userName="Alice" />)
    await user.click(screen.getByRole('button', { name: /sign out/i }))
    expect(mockSignOut).toHaveBeenCalled()
  })
})
