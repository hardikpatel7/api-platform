import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockUpdate = vi.fn()
const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()

// Chainable mock builder
function makeFrom() {
  const chain = {
    update: (data: unknown) => { mockUpdate(data); return chain },
    insert: (data: unknown) => { mockInsert(data); return chain },
    select: (...args: unknown[]) => { mockSelect(...args); return chain },
    eq: (...args: unknown[]) => { mockEq(...args); return chain },
    single: () => mockSingle(),
  }
  return chain
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: () => makeFrom(),
  }),
}))

const { approveSuggestionAction } = await import('@/app/actions/approveSuggestion')
const { rejectSuggestionAction } = await import('@/app/actions/rejectSuggestion')
const { withdrawSuggestionAction } = await import('@/app/actions/withdrawSuggestion')

const editor = { id: 'u2', user_metadata: { name: 'Bob' } }
const suggester = { id: 'u1', user_metadata: {} }

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: editor } })
  mockSingle.mockResolvedValue({ data: { id: 'u2', name: 'Bob' }, error: null })
  mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
  mockInsert.mockResolvedValue({ error: null })
  mockEq.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
})

describe('approveSuggestionAction', () => {
  it('updates suggestion status to approved', async () => {
    await approveSuggestionAction('s1')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'approved' })
    )
  })

  it('returns error when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await approveSuggestionAction('s1')
    expect(result?.error).toBeDefined()
  })
})

describe('rejectSuggestionAction', () => {
  it('updates suggestion status to rejected with note', async () => {
    await rejectSuggestionAction('s1', 'Not needed')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'rejected', review_note: 'Not needed' })
    )
  })

  it('returns error when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await rejectSuggestionAction('s1', '')
    expect(result?.error).toBeDefined()
  })
})

describe('withdrawSuggestionAction', () => {
  it('sets status to rejected with withdrawn note', async () => {
    mockGetUser.mockResolvedValue({ data: { user: suggester } })
    await withdrawSuggestionAction('s1')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'rejected', review_note: 'Withdrawn by author' })
    )
  })

  it('returns error when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await withdrawSuggestionAction('s1')
    expect(result?.error).toBeDefined()
  })
})
