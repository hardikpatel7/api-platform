import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import ProjectPage from '@/app/(platform)/projects/[projectId]/page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ projectId: 'p1' }),
  usePathname: () => '/projects/p1',
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('@/hooks/useRole', () => ({
  useRole: vi.fn(() => ({ role: 'editor', loading: false, noAdminExists: false })),
}))

vi.mock('@/app/actions/search', () => ({
  semanticSearchAction: vi.fn(),
}))

vi.mock('@/app/actions/bulkImport', () => ({
  bulkImportAction: vi.fn(),
}))

const stableApis = [
  {
    id: 'api-local',
    project_id: 'p1',
    name: 'Local API',
    method: 'GET',
    endpoint: '/local',
    created_by: 'u1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

const stableProjects = [
  { id: 'p1', name: 'Project One', created_by: 'u1', created_at: '2024-01-01T00:00:00Z' },
  { id: 'p2', name: 'Project Two', created_by: 'u1', created_at: '2024-01-01T00:00:00Z' },
]

vi.mock('@/store/apiStore', () => ({
  useApiStore: vi.fn(() => ({
    apis: stableApis,
    setApis: vi.fn(),
    loading: false,
    setLoading: vi.fn(),
  })),
}))

vi.mock('@/store/projectStore', () => ({
  useProjectStore: vi.fn(() => ({
    projects: stableProjects,
    setProjects: vi.fn(),
    apiCounts: {},
    mergeApiCount: vi.fn(),
  })),
}))

// Cross-project search result — from p2, not the current project
const crossProjectEntry = {
  id: 'api-remote',
  project_id: 'p2',
  name: 'Remote API',
  method: 'POST',
  endpoint: '/remote',
  created_by: 'u2',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

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
          eq: () => ({ single: vi.fn().mockResolvedValue({ data: stableProjects[0], error: null }) }),
          order: vi.fn().mockResolvedValue({ data: stableProjects, error: null }),
        }),
      }
    }
    if (table === 'api_entries') {
      return {
        select: () => ({
          eq: () => ({
            order: vi.fn().mockResolvedValue({ data: stableApis, error: null }),
            in: vi.fn().mockResolvedValue({ data: [crossProjectEntry], error: null }),
          }),
          in: vi.fn().mockResolvedValue({ data: [crossProjectEntry], error: null }),
        }),
      }
    }
    if (table === 'suggestions') {
      return {
        select: () => ({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }
    }
    return {}
  })
})

describe('ProjectPage — cross-project search', () => {
  it('shows result from another project when search returns its ID', async () => {
    const { semanticSearchAction } = await import('@/app/actions/search')
    vi.mocked(semanticSearchAction).mockResolvedValue({ ids: ['api-remote'] })

    render(<ProjectPage />)

    await waitFor(() => {
      expect(screen.getByText('Local API')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search APIs…')
    fireEvent.change(searchInput, { target: { value: 'remote endpoints' } })
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' })

    await waitFor(() => {
      expect(screen.getByText('Remote API')).toBeInTheDocument()
    })
  })

  it('shows project name badge on cross-project search results', async () => {
    const { semanticSearchAction } = await import('@/app/actions/search')
    vi.mocked(semanticSearchAction).mockResolvedValue({ ids: ['api-remote'] })

    render(<ProjectPage />)

    await waitFor(() => {
      expect(screen.getByText('Local API')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search APIs…')
    fireEvent.change(searchInput, { target: { value: 'remote' } })
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' })

    await waitFor(() => {
      const badge = screen.getByTestId('project-name-badge')
      expect(badge).toBeInTheDocument()
      expect(badge.textContent).toBe('Project Two')
    })
  })

  it('shows cross-project subtitle when search is active', async () => {
    const { semanticSearchAction } = await import('@/app/actions/search')
    vi.mocked(semanticSearchAction).mockResolvedValue({ ids: ['api-remote'] })

    render(<ProjectPage />)

    await waitFor(() => expect(screen.getByText('Local API')).toBeInTheDocument())

    const searchInput = screen.getByPlaceholderText('Search APIs…')
    fireEvent.change(searchInput, { target: { value: 'remote' } })
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' })

    await waitFor(() => {
      expect(screen.getByText('1 results across all projects')).toBeInTheDocument()
    })
  })
})
