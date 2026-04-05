import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import HomePage from '@/app/(platform)/page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('@/hooks/useRole', () => ({
  useRole: vi.fn(),
}))

vi.mock('@/store/projectStore', () => ({
  useProjectStore: vi.fn(() => ({
    projects: [
      {
        id: 'p1',
        name: 'Alpha Project',
        description: '',
        created_by: 'u1',
        created_at: '2024-01-01T00:00:00Z',
      },
    ],
    setProjects: vi.fn(),
    addProject: vi.fn(),
    removeProject: vi.fn(),
    loading: false,
    setLoading: vi.fn(),
  })),
}))

const mockFrom = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    from: mockFrom,
  }),
}))

import { useRole } from '@/hooks/useRole'

beforeEach(() => {
  vi.mocked(mockFrom).mockReturnValue({
    select: () => ({
      order: () => ({ data: [], error: null }),
      eq: () => ({ data: null, error: null }),
    }),
  })
})

describe('HomePage — role gating', () => {
  it('shows New project button for editor role', async () => {
    vi.mocked(useRole).mockReturnValue({ role: 'editor', loading: false })
    render(<HomePage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new project/i })).toBeInTheDocument()
    })
  })

  it('shows New project button for admin role', async () => {
    vi.mocked(useRole).mockReturnValue({ role: 'admin', loading: false })
    render(<HomePage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new project/i })).toBeInTheDocument()
    })
  })

  it('hides New project button for viewer role', async () => {
    vi.mocked(useRole).mockReturnValue({ role: 'viewer', loading: false })
    render(<HomePage />)
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /new project/i })).not.toBeInTheDocument()
    })
  })

  it('hides New project button for suggester role', async () => {
    vi.mocked(useRole).mockReturnValue({ role: 'suggester', loading: false })
    render(<HomePage />)
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /new project/i })).not.toBeInTheDocument()
    })
  })

  it('hides Delete button for viewer role', async () => {
    vi.mocked(useRole).mockReturnValue({ role: 'viewer', loading: false })
    render(<HomePage />)
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    })
  })

  it('shows Delete button for editor role', async () => {
    vi.mocked(useRole).mockReturnValue({ role: 'editor', loading: false })
    render(<HomePage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
    })
  })
})

describe('HomePage — sidebar navigation', () => {
  it('shows Suggestions link in sidebar for editor', async () => {
    vi.mocked(useRole).mockReturnValue({ role: 'editor', loading: false })
    render(<HomePage />)
    await waitFor(() => {
      expect(screen.getByText('Suggestions')).toBeInTheDocument()
    })
  })

  it('shows Users link in sidebar for admin', async () => {
    vi.mocked(useRole).mockReturnValue({ role: 'admin', loading: false })
    render(<HomePage />)
    await waitFor(() => {
      expect(screen.getByText(/users/i)).toBeInTheDocument()
    })
  })
})
