import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import SuggestionsPage from '@/app/(platform)/suggestions/page'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/suggestions',
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('@/hooks/useRole', () => ({
  useRole: vi.fn(() => ({ role: 'editor', loading: false })),
}))

import { useRole } from '@/hooks/useRole'

vi.mock('@/store/projectStore', () => ({
  useProjectStore: vi.fn(() => ({ projects: [], setProjects: vi.fn() })),
}))

vi.mock('@/app/actions/approveSuggestion', () => ({
  approveSuggestionAction: vi.fn(),
}))
vi.mock('@/app/actions/rejectSuggestion', () => ({
  rejectSuggestionAction: vi.fn(),
}))
vi.mock('@/app/actions/withdrawSuggestion', () => ({
  withdrawSuggestionAction: vi.fn(),
}))

const pendingSuggestion = {
  id: 's1', type: 'edit', project_id: 'p1', project_name: 'Alpha',
  api_id: 'a1', api_name: 'Get Users', user_id: 'u1', user_name: 'Alice',
  payload: { name: 'List Users' }, original: { name: 'Get Users' },
  status: 'pending', created_at: '2024-01-15T10:00:00Z',
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
    if (table === 'suggestions') {
      return {
        select: () => ({
          order: vi.fn().mockResolvedValue({ data: [pendingSuggestion], error: null }),
        }),
      }
    }
    if (table === 'projects') {
      return {
        select: () => ({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }
    }
    return {}
  })
})

describe('SuggestionsPage', () => {
  it('renders the suggestion panel after fetching suggestions', async () => {
    render(<SuggestionsPage />)
    await waitFor(() => {
      expect(screen.getByText('Get Users')).toBeInTheDocument()
    })
  })

  it('shows pending tab by default', async () => {
    render(<SuggestionsPage />)
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /pending/i })).toBeInTheDocument()
    })
  })

  it('redirects viewer away from suggestions page', async () => {
    vi.mocked(useRole).mockReturnValue({ role: 'viewer', loading: false })
    mockPush.mockClear()

    render(<SuggestionsPage />)
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })
})
