import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import SettingsUsersPage from '@/app/(platform)/settings/users/page'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/settings/users',
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('@/hooks/useRole', () => ({
  useRole: vi.fn(() => ({ role: 'admin', loading: false, noAdminExists: false })),
}))

import { useRole } from '@/hooks/useRole'

vi.mock('@/store/projectStore', () => ({
  useProjectStore: vi.fn(() => ({ projects: [], setProjects: vi.fn() })),
}))

const mockUsers = [
  { id: 'u1', name: 'Alice', role: 'admin', created_at: '2024-01-01T00:00:00Z' },
  { id: 'u2', name: 'Bob', role: 'editor', created_at: '2024-01-02T00:00:00Z' },
]

const mockFrom = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    from: mockFrom,
  }),
}))

beforeEach(() => {
  vi.mocked(useRole).mockReturnValue({ role: 'admin', loading: false, noAdminExists: false })

  vi.mocked(mockFrom).mockImplementation((table: string) => {
    if (table === 'users') {
      return {
        select: () => ({
          order: vi.fn().mockResolvedValue({ data: mockUsers, error: null }),
          eq: () => ({ single: vi.fn().mockResolvedValue({ data: mockUsers[0], error: null }) }),
        }),
        update: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        delete: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        insert: vi.fn().mockResolvedValue({ error: null }),
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

describe('SettingsUsersPage', () => {
  it('renders all users after fetching', async () => {
    render(<SettingsUsersPage />)
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
    })
  })

  it('shows User Management heading', async () => {
    render(<SettingsUsersPage />)
    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument()
    })
  })

  it('redirects non-admin away from user management', async () => {
    vi.mocked(useRole).mockReturnValue({ role: 'editor', loading: false, noAdminExists: false })
    mockPush.mockClear()

    render(<SettingsUsersPage />)
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })
})
