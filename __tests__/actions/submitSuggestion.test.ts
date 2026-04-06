import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockInsert = vi.fn()
const mockGetUser = vi.fn()
const mockUserSingle = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === 'users') {
        return { select: () => ({ eq: () => ({ single: mockUserSingle }) }) }
      }
      return { insert: mockInsert }
    },
  }),
}))

vi.mock('@/lib/logHistory', () => ({
  logHistoryAction: vi.fn().mockResolvedValue(undefined),
}))

// Import after mock
const { submitSuggestionAction } = await import('@/app/actions/submitSuggestion')

beforeEach(() => {
  mockInsert.mockReset()
  mockGetUser.mockReset()
  mockUserSingle.mockReset()
  mockInsert.mockResolvedValue({ error: null })
  mockUserSingle.mockResolvedValue({ data: { name: 'Alice' }, error: null })
})

describe('submitSuggestionAction', () => {
  it('inserts a pending suggestion row', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })

    await submitSuggestionAction({
      type: 'edit',
      projectId: 'p1',
      apiId: 'a1',
      payload: { name: 'List Users' },
      original: { name: 'Get Users' },
      apiName: 'Get Users',
      projectName: 'Alpha',
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'edit',
        project_id: 'p1',
        api_id: 'a1',
        status: 'pending',
        user_id: 'u1',
        payload: { name: 'List Users' },
        original: { name: 'Get Users' },
      })
    )
  })

  it('includes api_name, project_name, and user_name in the insert', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockUserSingle.mockResolvedValue({ data: { name: 'Alice' }, error: null })

    await submitSuggestionAction({
      type: 'edit',
      projectId: 'p1',
      apiId: 'a1',
      payload: { name: 'List Users' },
      apiName: 'Get Users',
      projectName: 'Alpha',
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        api_name: 'Get Users',
        project_name: 'Alpha',
        user_name: 'Alice',
      })
    )
  })

  it('returns an error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await submitSuggestionAction({
      type: 'create',
      projectId: 'p1',
      apiId: null,
      payload: { name: 'New API' },
      apiName: 'New API',
      projectName: 'Alpha',
    })

    expect(result?.error).toBeDefined()
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns the supabase error when insert fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockInsert.mockResolvedValue({ error: { message: 'DB error' } })

    const result = await submitSuggestionAction({
      type: 'edit',
      projectId: 'p1',
      apiId: 'a1',
      payload: { name: 'x' },
      apiName: 'Get Users',
      projectName: 'Alpha',
    })

    expect(result?.error).toBe('DB error')
  })
})
