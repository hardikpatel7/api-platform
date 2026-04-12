import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import ApiDetailPage from '@/app/(platform)/projects/[projectId]/apis/[apiId]/page'
import { generateApiDocsAction } from '@/app/actions/generate'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ projectId: 'p1', apiId: 'api-1' }),
  usePathname: () => '/projects/p1/apis/api-1',
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('@/hooks/useRole', () => ({
  useRole: vi.fn(() => ({ role: 'editor', loading: false })),
}))

import { useRole } from '@/hooks/useRole'

const stableApis: never[] = []
vi.mock('@/store/apiStore', () => ({
  useApiStore: vi.fn(() => ({
    apis: stableApis,
    updateApi: vi.fn(),
    removeApi: vi.fn(),
  })),
}))

vi.mock('@/store/projectStore', () => ({
  useProjectStore: vi.fn(() => ({
    projects: [{ id: 'p1', name: 'Alpha', created_by: 'u1', created_at: '2024-01-01T00:00:00Z' }],
    setProjects: vi.fn(),
  })),
}))

vi.mock('@/app/actions/generate', () => ({
  generateApiDocsAction: vi.fn(),
}))

const mockSubmitSuggestion = vi.fn()
vi.mock('@/app/actions/submitSuggestion', () => ({
  submitSuggestionAction: (...args: unknown[]) => mockSubmitSuggestion(...args),
}))

const mockFrom = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    from: mockFrom,
  }),
}))

const testEntry = {
  id: 'api-1',
  project_id: 'p1',
  name: 'Get Items',
  method: 'GET',
  endpoint: '/api/v1/items',
  status: 'Stable',
  version: 'v1',
  created_by: 'u1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const testHistoryEvent = {
  id: 'h1',
  action: 'created',
  api_id: 'api-1',
  api_name: 'Get Items',
  project_id: 'p1',
  project_name: 'Test Project',
  user_id: 'u1',
  user_name: 'Alice',
  user_role: 'editor',
  detail: 'Created: Get Items',
  created_at: '2024-01-02T00:00:00Z',
}

beforeEach(() => {
  vi.mocked(useRole).mockReturnValue({ role: 'editor', loading: false })
  mockSubmitSuggestion.mockReset()
  mockSubmitSuggestion.mockResolvedValue(undefined)

  vi.mocked(mockFrom).mockImplementation((table: string) => {
    if (table === 'api_entries') {
      return {
        select: () => ({
          eq: () => ({
            single: vi.fn().mockResolvedValue({ data: testEntry, error: null }),
            order: vi.fn().mockResolvedValue({ data: [testHistoryEvent], error: null }),
          }),
        }),
        update: () => ({ eq: () => ({ select: () => ({ single: vi.fn() }) }) }),
        delete: () => ({ eq: vi.fn() }),
      }
    }
    if (table === 'history_events') {
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: vi.fn().mockResolvedValue({ data: [testHistoryEvent], error: null }),
            }),
          }),
        }),
      }
    }
    return { select: () => ({ eq: () => ({ single: vi.fn().mockResolvedValue({ data: null }) }) }) }
  })
})

describe('ApiDetailPage — history events', () => {
  it('shows history event in the History tab after fetching from Supabase', async () => {
    render(<ApiDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Get Items')).toBeInTheDocument()
    })

    const historyTab = screen.getByRole('tab', { name: /history/i })
    fireEvent.click(historyTab)

    await waitFor(() => {
      expect(screen.getByText('Created: Get Items')).toBeInTheDocument()
    })
  })

  it('shows empty state in History tab when no events exist', async () => {
    vi.mocked(mockFrom).mockImplementation((table: string) => {
      if (table === 'api_entries') {
        return {
          select: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue({ data: testEntry, error: null }),
            }),
          }),
          update: () => ({ eq: () => ({ select: () => ({ single: vi.fn() }) }) }),
          delete: () => ({ eq: vi.fn() }),
        }
      }
      if (table === 'history_events') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }
      }
      return { select: () => ({ eq: () => ({ single: vi.fn().mockResolvedValue({ data: null }) }) }) }
    })

    render(<ApiDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Get Items')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('tab', { name: /history/i }))

    await waitFor(() => {
      expect(screen.getByText('No history yet')).toBeInTheDocument()
    })
  })
})

describe('ApiDetailPage — suggestion badge', () => {
  it('shows Suggestion badge when suggester opens the edit form', async () => {
    vi.mocked(useRole).mockReturnValue({ role: 'suggester', loading: false })

    render(<ApiDetailPage />)
    await waitFor(() => expect(screen.getByText('Get Items')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Suggest Edit' }))

    await waitFor(() => {
      expect(screen.getByTestId('suggestion-badge')).toBeInTheDocument()
    })
  })

  it('does not show Suggestion badge for editor edit mode', async () => {
    render(<ApiDetailPage />) // role is 'editor' by default
    await waitFor(() => expect(screen.getByText('Get Items')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument())
    expect(screen.queryByTestId('suggestion-badge')).not.toBeInTheDocument()
  })
})

describe('ApiDetailPage — suggester routing', () => {
  it('calls submitSuggestionAction with type delete when suggester clicks Suggest Delete', async () => {
    vi.mocked(useRole).mockReturnValue({ role: 'suggester', loading: false })
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<ApiDetailPage />)
    await waitFor(() => expect(screen.getByText('Get Items')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Suggest Delete' }))

    await waitFor(() => {
      expect(mockSubmitSuggestion).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'delete', apiId: 'api-1' })
      )
    })
  })

  it('shows Submit Suggestion label on the edit form when role is suggester', async () => {
    vi.mocked(useRole).mockReturnValue({ role: 'suggester', loading: false })

    render(<ApiDetailPage />)
    await waitFor(() => expect(screen.getByText('Get Items')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Suggest Edit' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Submit Suggestion' })).toBeInTheDocument()
    })
  })

  it('calls submitSuggestionAction with type edit when suggester submits the edit form', async () => {
    vi.mocked(useRole).mockReturnValue({ role: 'suggester', loading: false })

    render(<ApiDetailPage />)
    await waitFor(() => expect(screen.getByText('Get Items')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Suggest Edit' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Submit Suggestion' })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Submit Suggestion' }))

    await waitFor(() => {
      expect(mockSubmitSuggestion).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'edit', apiId: 'api-1' })
      )
    })
  })
})

describe('ApiDetailPage — MCP Generate from empty state', () => {
  it('calls generateApiDocsAction and saves result when Generate button is clicked', async () => {
    vi.mocked(generateApiDocsAction).mockResolvedValue({
      tool_description: 'Generated desc',
      mcp_config: JSON.stringify({ name: 'get_items' }),
    })

    const mockUpdate = vi.fn().mockReturnValue({
      eq: () => ({
        select: () => ({
          single: vi.fn().mockResolvedValue({
            data: { ...testEntry, mcp_config: { name: 'get_items' } },
            error: null,
          }),
        }),
      }),
    })

    vi.mocked(mockFrom).mockImplementation((table: string) => {
      if (table === 'api_entries') {
        return {
          select: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue({ data: { ...testEntry, mcp_config: null }, error: null }),
            }),
          }),
          update: mockUpdate,
          delete: () => ({ eq: vi.fn() }),
        }
      }
      if (table === 'history_events') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }
      }
      return {}
    })

    render(<ApiDetailPage />)
    await waitFor(() => expect(screen.getByText('Get Items')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('tab', { name: /mcp config/i }))
    await waitFor(() => expect(screen.getByText('No MCP config yet')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: '✨ Generate' }))

    await waitFor(() => {
      expect(generateApiDocsAction).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Get Items', method: 'GET', endpoint: '/api/v1/items' })
      )
    })

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          tool_description: 'Generated desc',
          mcp_config: JSON.stringify({ name: 'get_items' }),
        })
      )
    })
  })
})
