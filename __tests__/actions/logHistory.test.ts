import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockInsert = vi.fn()
const mockSingle = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === 'users') {
        return { select: () => ({ eq: () => ({ single: mockSingle }) }) }
      }
      return { insert: mockInsert }
    },
  }),
}))

const { logHistoryAction } = await import('@/lib/logHistory')

beforeEach(() => {
  mockGetUser.mockReset()
  mockInsert.mockReset()
  mockSingle.mockReset()
  mockInsert.mockResolvedValue({ error: null })
  mockSingle.mockResolvedValue({ data: { name: 'Alice', role: 'editor' }, error: null })
})

describe('logHistoryAction', () => {
  it('inserts a history_events row with the correct fields', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })

    await logHistoryAction({
      action: 'edited',
      apiId: 'a1',
      apiName: 'Get Users',
      projectId: 'p1',
      projectName: 'Alpha',
      detail: 'Edited: Get Users',
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'edited',
        api_id: 'a1',
        api_name: 'Get Users',
        project_id: 'p1',
        project_name: 'Alpha',
        detail: 'Edited: Get Users',
        user_id: 'u1',
        user_name: 'Alice',
        user_role: 'editor',
      })
    )
  })

  it('does nothing when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    await logHistoryAction({
      action: 'created',
      apiId: 'a1',
      apiName: 'New API',
      projectId: 'p1',
      projectName: 'Alpha',
      detail: 'Created: New API',
    })

    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('uses fallback name when users table row is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })

    await logHistoryAction({
      action: 'deleted',
      apiId: 'a1',
      apiName: 'Old API',
      projectId: 'p1',
      projectName: 'Alpha',
      detail: 'Deleted: Old API',
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_name: 'Unknown', user_role: 'viewer' })
    )
  })
})
