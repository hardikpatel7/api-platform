import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}))

import { semanticSearch } from '@/lib/ai/search'

const mockIndex = [
  { id: 'api-1', name: 'Get Users', method: 'GET', endpoint: '/users', tool_description: 'Returns all users', tags: ['auth'], group: 'Users', projectName: 'Alpha' },
  { id: 'api-2', name: 'Create Order', method: 'POST', endpoint: '/orders', tool_description: 'Creates a new order', tags: ['write'], group: 'Orders', projectName: 'Alpha' },
  { id: 'api-3', name: 'Delete Item', method: 'DELETE', endpoint: '/items/{id}', tool_description: 'Deletes an item', tags: [], group: 'Inventory', projectName: 'Beta' },
]

describe('semanticSearch', () => {
  beforeEach(() => mockCreate.mockReset())

  it('sends the query and serialised API index to Claude', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '["api-1"]' }],
    })
    await semanticSearch('find users endpoint', mockIndex)
    expect(mockCreate).toHaveBeenCalledOnce()
    const callArg = mockCreate.mock.calls[0][0]
    const prompt = callArg.messages[0].content as string
    expect(prompt).toContain('find users endpoint')
    expect(prompt).toContain('Get Users')
    expect(prompt).toContain('api-1')
  })

  it('uses claude-sonnet-4-5 model', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '["api-1"]' }],
    })
    await semanticSearch('query', mockIndex)
    expect(mockCreate.mock.calls[0][0].model).toBe('claude-sonnet-4-5')
  })

  it('returns ordered array of matching IDs', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '["api-3","api-1"]' }],
    })
    const result = await semanticSearch('delete or get', mockIndex)
    expect(result).toEqual(['api-3', 'api-1'])
  })

  it('returns empty array when Claude returns empty list', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '[]' }],
    })
    const result = await semanticSearch('nothing matches', mockIndex)
    expect(result).toEqual([])
  })

  it('filters out IDs not present in the provided index', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '["api-1","nonexistent-id"]' }],
    })
    const result = await semanticSearch('query', mockIndex)
    expect(result).toEqual(['api-1'])
    expect(result).not.toContain('nonexistent-id')
  })

  it('throws when the AI response is not a JSON array', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'not json' }],
    })
    await expect(semanticSearch('query', mockIndex)).rejects.toThrow()
  })
})
