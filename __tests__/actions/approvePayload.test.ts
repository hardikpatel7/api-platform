import { describe, it, expect, vi, beforeEach } from 'vitest'

// Table-aware chainable mock
const mockGetUser = vi.fn()
const store: Record<string, unknown> = {}

function makeChain(table: string) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.single = vi.fn(() =>
    table === 'suggestions'
      ? Promise.resolve({ data: store['suggestion'], error: null })
      : table === 'users'
        ? Promise.resolve({ data: { id: 'u2', name: 'Bob' }, error: null })
        : Promise.resolve({ data: null, error: null })
  )
  chain.update = vi.fn(() => chain)
  chain.insert = vi.fn(() => {
    const insertChain: Record<string, unknown> = {}
    insertChain.select = vi.fn(() => ({
      single: vi.fn(() => Promise.resolve({ data: { id: 'new-api-id' }, error: null })),
    }))
    return insertChain
  })
  chain.delete = vi.fn(() => chain)
  return chain
}

const chains: Record<string, ReturnType<typeof makeChain>> = {}

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (!chains[table]) chains[table] = makeChain(table)
      return chains[table]
    },
  }),
}))

vi.mock('@/lib/logHistory', () => ({ logHistoryAction: vi.fn() }))

const { approveSuggestionAction } = await import('@/app/actions/approveSuggestion')

beforeEach(() => {
  vi.clearAllMocks()
  for (const key of Object.keys(chains)) delete chains[key]
  mockGetUser.mockResolvedValue({ data: { user: { id: 'u2' } } })
})

describe('approveSuggestionAction — edit type', () => {
  it('updates api_entries with the suggestion payload', async () => {
    store['suggestion'] = {
      id: 's1', type: 'edit', api_id: 'api-1',
      api_name: 'Get Items', project_id: 'p1', project_name: 'P1',
      payload: { name: 'List Items', endpoint: '/api/v1/items', method: 'GET' },
    }
    await approveSuggestionAction('s1')

    const apiChain = chains['api_entries']
    expect(apiChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'List Items' })
    )
  })
})

describe('approveSuggestionAction — create type', () => {
  it('inserts a new api_entries row from the suggestion payload', async () => {
    store['suggestion'] = {
      id: 's2', type: 'create', api_id: null,
      api_name: 'New API', project_id: 'p1', project_name: 'P1',
      payload: { name: 'New API', endpoint: '/api/v1/new', method: 'POST', project_id: 'p1', created_by: 'u1' },
    }
    await approveSuggestionAction('s2')

    const apiChain = chains['api_entries']
    expect(apiChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New API' })
    )
  })
})

describe('approveSuggestionAction — delete type', () => {
  it('deletes the api_entries row for the suggestion api_id', async () => {
    store['suggestion'] = {
      id: 's3', type: 'delete', api_id: 'api-2',
      api_name: 'Old API', project_id: 'p1', project_name: 'P1',
      payload: null,
    }
    await approveSuggestionAction('s3')

    const apiChain = chains['api_entries']
    expect(apiChain.delete).toHaveBeenCalled()
    expect(apiChain.eq).toHaveBeenCalledWith('id', 'api-2')
  })
})
