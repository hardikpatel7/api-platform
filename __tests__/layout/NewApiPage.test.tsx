import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import NewApiPage from '@/app/(platform)/projects/[projectId]/apis/new/page'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ projectId: 'p1' }),
  usePathname: () => '/projects/p1/apis/new',
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('@/hooks/useRole', () => ({
  useRole: vi.fn(() => ({ role: 'editor', loading: false })),
}))

import { useRole } from '@/hooks/useRole'

vi.mock('@/store/apiStore', () => ({
  useApiStore: vi.fn(() => ({ addApi: vi.fn() })),
}))

vi.mock('@/store/projectStore', () => ({
  useProjectStore: vi.fn(() => ({
    projects: [{ id: 'p1', name: 'Alpha', created_by: 'u1', created_at: '2024-01-01T00:00:00Z' }],
    setProjects: vi.fn(),
  })),
}))

const mockSubmitSuggestion = vi.fn()
vi.mock('@/app/actions/submitSuggestion', () => ({
  submitSuggestionAction: (...args: unknown[]) => mockSubmitSuggestion(...args),
}))

vi.mock('@/app/actions/generate', () => ({
  generateApiDocsAction: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    from: () => ({
      insert: () => ({
        select: () => ({ single: vi.fn().mockResolvedValue({ data: null, error: { message: 'no insert' } }) }),
      }),
    }),
  }),
}))

beforeEach(() => {
  mockSubmitSuggestion.mockReset()
  mockSubmitSuggestion.mockResolvedValue(undefined)
  mockPush.mockClear()
  vi.mocked(useRole).mockReturnValue({ role: 'editor', loading: false })
})

describe('NewApiPage — suggestion badge', () => {
  it('shows Suggestion badge in the header when role is suggester', async () => {
    vi.mocked(useRole).mockReturnValue({ role: 'suggester', loading: false })
    render(<NewApiPage />)
    await waitFor(() => {
      expect(screen.getByTestId('suggestion-badge')).toBeInTheDocument()
    })
  })

  it('does not show Suggestion badge for editor role', async () => {
    vi.mocked(useRole).mockReturnValue({ role: 'editor', loading: false })
    render(<NewApiPage />)
    await waitFor(() => expect(screen.getByRole('button', { name: /create api/i })).toBeInTheDocument())
    expect(screen.queryByTestId('suggestion-badge')).not.toBeInTheDocument()
  })
})

describe('NewApiPage — suggester path', () => {
  it('shows Create API label for editor role', async () => {
    vi.mocked(useRole).mockReturnValue({ role: 'editor', loading: false })
    render(<NewApiPage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create api/i })).toBeInTheDocument()
    })
  })

  it('shows Submit Suggestion label when role is suggester', async () => {
    vi.mocked(useRole).mockReturnValue({ role: 'suggester', loading: false })
    render(<NewApiPage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submit suggestion/i })).toBeInTheDocument()
    })
  })

  it('calls submitSuggestionAction with type create when suggester submits the form', async () => {
    vi.mocked(useRole).mockReturnValue({ role: 'suggester', loading: false })

    render(<NewApiPage />)
    await waitFor(() => expect(screen.getByRole('button', { name: /submit suggestion/i })).toBeInTheDocument())

    fireEvent.change(screen.getByRole('textbox', { name: /^name/i }), { target: { value: 'New API' } })
    fireEvent.change(screen.getByRole('textbox', { name: /endpoint/i }), { target: { value: '/api/new' } })

    fireEvent.click(screen.getByRole('button', { name: /submit suggestion/i }))

    await waitFor(() => {
      expect(mockSubmitSuggestion).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'create', projectId: 'p1' })
      )
    })
  })
})
