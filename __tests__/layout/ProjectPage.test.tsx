import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import ProjectPage from '@/app/(platform)/projects/[projectId]/page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ projectId: 'p1' }),
  usePathname: () => '/projects/p1',
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('@/hooks/useRole', () => ({ useRole: vi.fn() }))
import { useRole } from '@/hooks/useRole'

vi.mock('@/store/apiStore', () => ({
  useApiStore: vi.fn(() => ({ apis: [], setApis: vi.fn(), loading: false, setLoading: vi.fn() })),
}))

vi.mock('@/store/projectStore', () => ({
  useProjectStore: vi.fn(() => ({
    projects: [{ id: 'p1', name: 'Alpha', created_by: 'u1', created_at: '2024-01-01T00:00:00Z' }],
    setProjects: vi.fn(),
    apiCounts: {},
    mergeApiCount: vi.fn(),
  })),
}))

vi.mock('@/app/actions/search', () => ({ semanticSearchAction: vi.fn() }))
vi.mock('@/app/actions/bulkImport', () => ({ bulkImportAction: vi.fn() }))

const mockFrom = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    from: mockFrom,
  }),
}))

beforeEach(() => {
  vi.mocked(mockFrom).mockImplementation((table: string) => {
    if (table === 'projects') {
      return {
        select: () => ({
          eq: () => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'p1', name: 'Alpha', created_by: 'u1', created_at: '2024-01-01T00:00:00Z' },
              error: null,
            }),
          }),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }
    }
    if (table === 'api_entries') {
      return {
        select: () => ({
          eq: () => ({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }
    }
    if (table === 'suggestions') {
      const chain = {
        eq: vi.fn(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
      chain.eq.mockReturnValue(chain)
      return { select: vi.fn().mockReturnValue(chain) }
    }
    return {}
  })
})

describe('ProjectPage — empty state', () => {
  it('shows empty state with Add API CTA for editor', async () => {
    vi.mocked(useRole).mockReturnValue({ role: 'editor', loading: false })
    render(<ProjectPage />)
    await waitFor(() => {
      expect(screen.getByText('No APIs yet')).toBeInTheDocument()
    })
    // ProjectActionBar + EmptyState both render Add API buttons when apis.length === 0
    expect(screen.getAllByRole('button', { name: /add api/i }).length).toBeGreaterThanOrEqual(1)
  })

  it('shows empty state with Import buttons for editor', async () => {
    vi.mocked(useRole).mockReturnValue({ role: 'editor', loading: false })
    render(<ProjectPage />)
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /import openapi/i }).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByRole('button', { name: /import har/i }).length).toBeGreaterThanOrEqual(1)
    })
  })

  it('shows Suggest new API CTA for suggester', async () => {
    vi.mocked(useRole).mockReturnValue({ role: 'suggester', loading: false })
    render(<ProjectPage />)
    await waitFor(() => {
      expect(screen.getByText('No APIs yet')).toBeInTheDocument()
    })
    // ProjectActionBar + EmptyState both render suggest buttons when apis.length === 0
    expect(screen.getAllByRole('button', { name: /suggest new api/i }).length).toBeGreaterThanOrEqual(1)
  })

  it('shows passive empty state for viewer', async () => {
    vi.mocked(useRole).mockReturnValue({ role: 'viewer', loading: false })
    render(<ProjectPage />)
    await waitFor(() => {
      expect(screen.getByText('No APIs yet')).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: /add api/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /suggest/i })).not.toBeInTheDocument()
  })
})
