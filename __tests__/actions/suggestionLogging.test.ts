import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: () => ({
      insert: mockInsert,
      update: () => ({ eq: mockEq }),
      select: () => ({ eq: () => ({ single: mockSingle }) }),
    }),
  }),
}))

const mockLogHistory = vi.fn()
vi.mock('@/lib/logHistory', () => ({
  logHistoryAction: (...args: unknown[]) => mockLogHistory(...args),
}))

const { submitSuggestionAction } = await import('@/app/actions/submitSuggestion')
const { approveSuggestionAction } = await import('@/app/actions/approveSuggestion')
const { rejectSuggestionAction } = await import('@/app/actions/rejectSuggestion')

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
  mockInsert.mockResolvedValue({ error: null })
  mockEq.mockResolvedValue({ error: null })
  mockSingle.mockResolvedValue({ data: { id: 'u1', name: 'Alice', role: 'editor' }, error: null })
})

describe('submitSuggestionAction — history logging', () => {
  it('logs suggested_edit when type is edit', async () => {
    await submitSuggestionAction({
      type: 'edit',
      projectId: 'p1',
      apiId: 'a1',
      payload: { name: 'New Name' },
      original: { name: 'Old Name' },
      apiName: 'Get Users',
      projectName: 'Alpha',
    })
    expect(mockLogHistory).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'suggested_edit' })
    )
  })

  it('logs suggested_create when type is create', async () => {
    await submitSuggestionAction({
      type: 'create',
      projectId: 'p1',
      apiId: null,
      payload: { name: 'New API' },
      apiName: 'New API',
      projectName: 'Alpha',
    })
    expect(mockLogHistory).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'suggested_create' })
    )
  })

  it('logs suggested_delete when type is delete', async () => {
    await submitSuggestionAction({
      type: 'delete',
      projectId: 'p1',
      apiId: 'a1',
      payload: null,
      apiName: 'Get Users',
      projectName: 'Alpha',
    })
    expect(mockLogHistory).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'suggested_delete' })
    )
  })
})

describe('approveSuggestionAction — history logging', () => {
  it('logs suggestion_approved', async () => {
    await approveSuggestionAction('s1', { apiId: 'a1', apiName: 'Get Users', projectId: 'p1', projectName: 'Alpha' })
    expect(mockLogHistory).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'suggestion_approved' })
    )
  })
})

describe('rejectSuggestionAction — history logging', () => {
  it('logs suggestion_rejected', async () => {
    await rejectSuggestionAction('s1', 'Not needed', { apiId: 'a1', apiName: 'Get Users', projectId: 'p1', projectName: 'Alpha' })
    expect(mockLogHistory).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'suggestion_rejected' })
    )
  })
})
