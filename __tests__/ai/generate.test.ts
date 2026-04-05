import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the Anthropic SDK before importing the module under test
const mockCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}))

import { generateApiDocs } from '@/lib/ai/generate'

const validResponse = {
  tool_description: 'Fetches all inventory items from the database. Use this when you need a list of available products.',
  mcp_config: {
    name: 'get_inventory_items',
    description: 'Fetches all inventory items',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
}

function mockAIResponse(json: unknown) {
  mockCreate.mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify(json) }],
  })
}

describe('generateApiDocs', () => {
  beforeEach(() => mockCreate.mockReset())

  it('calls Anthropic with name, method, endpoint in the prompt', async () => {
    mockAIResponse(validResponse)
    await generateApiDocs({
      name: 'Get Items',
      method: 'GET',
      endpoint: '/api/v1/items',
    })
    expect(mockCreate).toHaveBeenCalledOnce()
    const callArg = mockCreate.mock.calls[0][0]
    const prompt = callArg.messages[0].content as string
    expect(prompt).toContain('Get Items')
    expect(prompt).toContain('GET')
    expect(prompt).toContain('/api/v1/items')
  })

  it('includes request and response schemas in the prompt when provided', async () => {
    mockAIResponse(validResponse)
    await generateApiDocs({
      name: 'Create Item',
      method: 'POST',
      endpoint: '/api/v1/items',
      requestSchema: { type: 'object' },
      responseSchema: { type: 'object' },
    })
    const callArg = mockCreate.mock.calls[0][0]
    const prompt = callArg.messages[0].content as string
    expect(prompt).toContain('"type": "object"')
  })

  it('uses claude-sonnet-4-5 model', async () => {
    mockAIResponse(validResponse)
    await generateApiDocs({ name: 'X', method: 'GET', endpoint: '/x' })
    const callArg = mockCreate.mock.calls[0][0]
    expect(callArg.model).toBe('claude-sonnet-4-5')
  })

  it('returns tool_description and mcp_config from parsed response', async () => {
    mockAIResponse(validResponse)
    const result = await generateApiDocs({ name: 'X', method: 'GET', endpoint: '/x' })
    expect(result.tool_description).toBe(validResponse.tool_description)
    expect(result.mcp_config).toEqual(validResponse.mcp_config)
  })

  it('throws when the AI response is not valid JSON', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'not json' }],
    })
    await expect(generateApiDocs({ name: 'X', method: 'GET', endpoint: '/x' })).rejects.toThrow()
  })

  it('throws when tool_description is missing from response', async () => {
    mockAIResponse({ mcp_config: validResponse.mcp_config })
    await expect(generateApiDocs({ name: 'X', method: 'GET', endpoint: '/x' })).rejects.toThrow()
  })

  it('throws when mcp_config is missing from response', async () => {
    mockAIResponse({ tool_description: validResponse.tool_description })
    await expect(generateApiDocs({ name: 'X', method: 'GET', endpoint: '/x' })).rejects.toThrow()
  })
})
