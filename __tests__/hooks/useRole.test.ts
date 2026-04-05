import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useRole } from '@/hooks/useRole'

const mockGetUser = vi.fn()
const mockSingle = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: () => ({
      select: () => ({
        eq: () => ({ single: mockSingle }),
      }),
    }),
  }),
}))

beforeEach(() => {
  mockGetUser.mockReset()
  mockSingle.mockReset()
})

describe('useRole', () => {
  it('returns loading=true initially', () => {
    mockGetUser.mockReturnValue(new Promise(() => {})) // never resolves
    const { result } = renderHook(() => useRole())
    expect(result.current.loading).toBe(true)
    expect(result.current.role).toBeNull()
  })

  it('returns the role from the users table after fetching', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockSingle.mockResolvedValue({ data: { role: 'viewer' }, error: null })

    const { result } = renderHook(() => useRole())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.role).toBe('viewer')
  })

  it('returns null role when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { result } = renderHook(() => useRole())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.role).toBeNull()
  })

  it('returns null role when users table row is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const { result } = renderHook(() => useRole())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.role).toBeNull()
  })

  it('reflects the correct role for each UserRole value', async () => {
    for (const role of ['viewer', 'suggester', 'editor', 'admin'] as const) {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
      mockSingle.mockResolvedValue({ data: { role }, error: null })

      const { result } = renderHook(() => useRole())
      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(result.current.role).toBe(role)
    }
  })
})
