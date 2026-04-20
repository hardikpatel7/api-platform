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

import { useRole } from '@/hooks/useRole'

vi.mock('@/store/projectStore', () => ({
  useProjectStore: vi.fn(() => ({
    projects: [],
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

// A thenable mock object that behaves like a Supabase query chain.
// When awaited directly → allData (3 items).
// When .eq('user_id', ...) is called then awaited → scopedData (1 item).
function makeSuggestionsChain() {
  const allData = [{ id: 's1' }, { id: 's2' }, { id: 's3' }]
  const scopedData = [{ id: 's1' }]

  const chain: {
    eq: (field: string, value: string) => Promise<{ data: typeof scopedData; error: null }>
    then: (resolve: (v: { data: typeof allData; error: null }) => unknown) => Promise<unknown>
  } = {
    eq: (_field: string, _value: string) => Promise.resolve({ data: scopedData, error: null }),
    then: (resolve) => Promise.resolve({ data: allData, error: null }).then(resolve),
  }
  return chain
}

beforeEach(() => {
  vi.mocked(mockFrom).mockImplementation((table: string) => {
    if (table === 'suggestions') {
      return {
        select: () => ({
          eq: (_field: string, _value: string) => makeSuggestionsChain(),
        }),
      }
    }
    // projects and api_entries — return empty
    return {
      select: () => ({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        eq: () => ({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }),
      }),
    }
  })
})

describe('HomePage — pending count scoping', () => {
  it('shows all pending suggestions count for editor role', async () => {
    vi.mocked(useRole).mockReturnValue({ role: 'editor', loading: false, noAdminExists: false })

    render(<HomePage />)

    await waitFor(() => {
      // Suggestions button badge shows 3 (all pending)
      const btn = screen.getByText('Suggestions').closest('button')
      expect(btn?.textContent).toContain('3')
    })
  })

  it('shows only own pending suggestions count for suggester role', async () => {
    vi.mocked(useRole).mockReturnValue({ role: 'suggester', loading: false, noAdminExists: false })

    render(<HomePage />)

    await waitFor(() => {
      // Suggestions button badge shows 1 (own pending only)
      const btn = screen.getByText('Suggestions').closest('button')
      expect(btn?.textContent).toContain('1')
      expect(btn?.textContent).not.toContain('3')
    })
  })
})
