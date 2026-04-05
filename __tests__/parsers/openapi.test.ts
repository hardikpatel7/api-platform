import { describe, it, expect } from 'vitest'
import { parseOpenAPI } from '@/lib/parsers/openapi'

// ── OpenAPI 3.0 fixtures ──────────────────────────────────────────────────────

const oa3Spec = {
  openapi: '3.0.0',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {
    '/items': {
      get: {
        summary: 'List items',
        operationId: 'listItems',
        tags: ['Inventory'],
        description: 'Returns all inventory items',
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create item',
        tags: ['Inventory'],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { name: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          '201': {
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    },
    '/items/{id}': {
      delete: {
        summary: 'Delete item',
        tags: ['Inventory', 'Admin'],
        responses: { '204': { description: 'Deleted' } },
      },
    },
  },
}

const oa3NoTags = {
  openapi: '3.0.0',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {
    '/users': {
      get: {
        operationId: 'getUsers',
        responses: { '200': { description: 'ok' } },
      },
    },
  },
}

// ── Swagger 2.0 fixture ───────────────────────────────────────────────────────

const sw2Spec = {
  swagger: '2.0',
  info: { title: 'Swagger API', version: '1.0' },
  paths: {
    '/orders': {
      get: {
        summary: 'List orders',
        tags: ['Orders'],
        description: 'Returns all orders',
        parameters: [
          {
            in: 'query',
            name: 'status',
            type: 'string',
          },
        ],
        responses: {
          '200': {
            schema: { type: 'array', items: { type: 'object' } },
          },
        },
      },
      post: {
        summary: 'Create order',
        tags: ['Orders'],
        parameters: [
          {
            in: 'body',
            name: 'body',
            schema: {
              type: 'object',
              properties: { item: { type: 'string' } },
            },
          },
        ],
        responses: { '201': { description: 'created' } },
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────

describe('parseOpenAPI — OpenAPI 3.0', () => {
  it('returns one entry per path+method combination', () => {
    const result = parseOpenAPI(JSON.stringify(oa3Spec))
    expect(result.entries).toHaveLength(3)
  })

  it('uses summary as name when available', () => {
    const result = parseOpenAPI(JSON.stringify(oa3Spec))
    const listItems = result.entries.find((e) => e.method === 'GET' && e.endpoint === '/items')
    expect(listItems?.name).toBe('List items')
  })

  it('falls back to operationId when summary is missing', () => {
    const result = parseOpenAPI(JSON.stringify(oa3NoTags))
    expect(result.entries[0].name).toBe('getUsers')
  })

  it('maps endpoint and method correctly', () => {
    const result = parseOpenAPI(JSON.stringify(oa3Spec))
    const deleteItem = result.entries.find((e) => e.method === 'DELETE')
    expect(deleteItem?.endpoint).toBe('/items/{id}')
    expect(deleteItem?.method).toBe('DELETE')
  })

  it('uses tags[0] as group', () => {
    const result = parseOpenAPI(JSON.stringify(oa3Spec))
    const listItems = result.entries.find((e) => e.endpoint === '/items' && e.method === 'GET')
    expect(listItems?.group).toBe('Inventory')
  })

  it('lowercases all tags into the tags array', () => {
    const result = parseOpenAPI(JSON.stringify(oa3Spec))
    const deleteItem = result.entries.find((e) => e.method === 'DELETE')
    expect(deleteItem?.tags).toEqual(['inventory', 'admin'])
  })

  it('uses description as tool_description', () => {
    const result = parseOpenAPI(JSON.stringify(oa3Spec))
    const listItems = result.entries.find((e) => e.endpoint === '/items' && e.method === 'GET')
    expect(listItems?.tool_description).toBe('Returns all inventory items')
  })

  it('falls back to summary for tool_description when description is absent', () => {
    const result = parseOpenAPI(JSON.stringify(oa3Spec))
    const createItem = result.entries.find((e) => e.method === 'POST')
    expect(createItem?.tool_description).toBe('Create item')
  })

  it('extracts requestBody schema for POST (OA3)', () => {
    const result = parseOpenAPI(JSON.stringify(oa3Spec))
    const createItem = result.entries.find((e) => e.method === 'POST')
    expect(createItem?.request_schema).toEqual({
      type: 'object',
      properties: { name: { type: 'string' } },
    })
  })

  it('extracts 200 response schema', () => {
    const result = parseOpenAPI(JSON.stringify(oa3Spec))
    const listItems = result.entries.find((e) => e.endpoint === '/items' && e.method === 'GET')
    expect(listItems?.response_schema).toEqual({
      type: 'array',
      items: { type: 'object' },
    })
  })

  it('extracts 201 response schema when 200 is absent', () => {
    const result = parseOpenAPI(JSON.stringify(oa3Spec))
    const createItem = result.entries.find((e) => e.method === 'POST')
    expect(createItem?.response_schema).toEqual({ type: 'object' })
  })
})

describe('parseOpenAPI — Swagger 2.0', () => {
  it('parses swagger 2.0 paths', () => {
    const result = parseOpenAPI(JSON.stringify(sw2Spec))
    expect(result.entries).toHaveLength(2)
  })

  it('extracts body parameter schema as request_schema', () => {
    const result = parseOpenAPI(JSON.stringify(sw2Spec))
    const createOrder = result.entries.find((e) => e.method === 'POST')
    expect(createOrder?.request_schema).toEqual({
      type: 'object',
      properties: { item: { type: 'string' } },
    })
  })

  it('extracts 200 response schema from swagger 2.0', () => {
    const result = parseOpenAPI(JSON.stringify(sw2Spec))
    const listOrders = result.entries.find((e) => e.method === 'GET')
    expect(listOrders?.response_schema).toEqual({
      type: 'array',
      items: { type: 'object' },
    })
  })
})

describe('parseOpenAPI — error handling', () => {
  it('returns error for invalid JSON', () => {
    const result = parseOpenAPI('not valid json {')
    expect(result.error).toBeDefined()
    expect(result.entries).toHaveLength(0)
  })

  it('returns error when no paths found', () => {
    const result = parseOpenAPI(JSON.stringify({ openapi: '3.0.0', paths: {} }))
    expect(result.error).toBe('No API paths found')
    expect(result.entries).toHaveLength(0)
  })

  it('returns error for unrecognised spec format', () => {
    const result = parseOpenAPI(JSON.stringify({ not: 'a spec' }))
    expect(result.error).toBeDefined()
    expect(result.entries).toHaveLength(0)
  })
})
