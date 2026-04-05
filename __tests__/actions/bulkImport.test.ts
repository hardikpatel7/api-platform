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

const mockLogHistory = vi.fn()
vi.mock('@/lib/logHistory', () => ({
  logHistoryAction: (...args: unknown[]) => mockLogHistory(...args),
}))

const { bulkImportAction } = await import('@/app/actions/bulkImport')

const entries = [
  { name: 'Get Users', method: 'GET', endpoint: '/api/users' },
  { name: 'Create User', method: 'POST', endpoint: '/api/users' },
]

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
  mockSingle.mockResolvedValue({ data: { name: 'Alice', role: 'editor' }, error: null })
  mockInsert.mockResolvedValue({ error: null })
})

describe('bulkImportAction', () => {
  it('inserts all entries into api_entries with project_id and created_by', async () => {
    await bulkImportAction({ projectId: 'p1', projectName: 'Alpha', entries })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ project_id: 'p1', created_by: 'u1', name: 'Get Users' }),
        expect.objectContaining({ project_id: 'p1', created_by: 'u1', name: 'Create User' }),
      ])
    )
  })

  it('logs a bulk_import history event', async () => {
    await bulkImportAction({ projectId: 'p1', projectName: 'Alpha', entries })

    expect(mockLogHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'bulk_import',
        projectId: 'p1',
        projectName: 'Alpha',
      })
    )
  })

  it('detail string includes the count of imported entries', async () => {
    await bulkImportAction({ projectId: 'p1', projectName: 'Alpha', entries })

    expect(mockLogHistory).toHaveBeenCalledWith(
      expect.objectContaining({ detail: expect.stringContaining('2') })
    )
  })

  it('returns error when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await bulkImportAction({ projectId: 'p1', projectName: 'Alpha', entries })

    expect(result?.error).toBeDefined()
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns error when insert fails', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'DB error' } })

    const result = await bulkImportAction({ projectId: 'p1', projectName: 'Alpha', entries })

    expect(result?.error).toBe('DB error')
  })
})
