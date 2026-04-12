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
  useProjectStore: vi.fn(),
}))

const mockFrom = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    from: mockFrom,
  }),
}))

import { useRole } from '@/hooks/useRole'
import { useProjectStore } from '@/store/projectStore'

// A chainable/awaitable eq result
const makeEqChain = (): {
  data: null
  error: null
  eq: () => Promise<{ data: null; error: null }>
  then: (resolve: (v: { data: null; error: null }) => unknown) => Promise<unknown>
} => ({
  data: null,
  error: null,
  eq: () => Promise.resolve({ data: null, error: null }),
  then: (resolve) => Promise.resolve({ data: null, error: null }).then(resolve),
})

// Default: one project in the list
beforeEach(() => {
  vi.mocked(useProjectStore).mockReturnValue({
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
  })

  vi.mocked(mockFrom).mockReturnValue({
    select: () => ({
      order: () => ({ data: [], error: null }),
      eq: () => makeEqChain(),
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

describe('HomePage — empty state', () => {
  beforeEach(() => {
    vi.mocked(useProjectStore).mockReturnValue({
      projects: [],
      setProjects: vi.fn(),
      addProject: vi.fn(),
      removeProject: vi.fn(),
      loading: false,
      setLoading: vi.fn(),
    })
  })

  it('shows empty state hero for editor with New project CTA in content area', async () => {
    vi.mocked(useRole).mockReturnValue({ role: 'editor', loading: false })
    render(<HomePage />)
    await waitFor(() => {
      expect(screen.getByText('No projects yet')).toBeInTheDocument()
    })
    const buttons = screen.getAllByRole('button', { name: /new project/i })
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })

  it('shows passive empty state for viewer with no create CTA', async () => {
    vi.mocked(useRole).mockReturnValue({ role: 'viewer', loading: false })
    render(<HomePage />)
    await waitFor(() => {
      expect(screen.getByText('No projects yet')).toBeInTheDocument()
      expect(screen.getByText(/ask your admin/i)).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: /new project/i })).not.toBeInTheDocument()
  })

  it('shows passive empty state for suggester with no create CTA', async () => {
    vi.mocked(useRole).mockReturnValue({ role: 'suggester', loading: false })
    render(<HomePage />)
    await waitFor(() => {
      expect(screen.getByText('No projects yet')).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: /new project/i })).not.toBeInTheDocument()
  })
})
