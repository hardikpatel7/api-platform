import { describe, it, expect } from 'vitest'
import { parseHAR, inferSchema, normalizePath } from '@/lib/parsers/har'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEntry(overrides: {
  url?: string
  method?: string
  status?: number
  mimeType?: string
  responseBody?: string
  requestBody?: string
  requestMime?: string
  queryString?: { name: string; value: string }[]
  headers?: { name: string; value: string }[]
} = {}) {
  const url = overrides.url ?? 'https://api.example.com/users'
  const parsed = new URL(url)
  return {
    request: {
      method: overrides.method ?? 'GET',
      url,
      queryString: overrides.queryString ?? [],
      headers: overrides.headers ?? [],
      postData: overrides.requestBody
        ? {
            mimeType: overrides.requestMime ?? 'application/json',
            text: overrides.requestBody,
          }
        : undefined,
    },
    response: {
      status: overrides.status ?? 200,
      content: {
        mimeType: overrides.mimeType ?? 'application/json',
        text: overrides.responseBody ?? '{"id":1}',
        size: overrides.responseBody?.length ?? 8,
      },
    },
  }
}

const minimalHAR = (entries: ReturnType<typeof makeEntry>[]) =>
  JSON.stringify({ log: { entries } })

// ─────────────────────────────────────────────────────────────────────────────

describe('normalizePath', () => {
  it('replaces numeric segments with {id}', () => {
    expect(normalizePath('/orders/1042')).toBe('/orders/{id}')
  })

  it('replaces UUID segments with {id}', () => {
    expect(normalizePath('/users/3f2a1b4c-5d6e-7f8a-9b0c-1d2e3f4a5b6c')).toBe('/users/{id}')
  })

  it('leaves non-dynamic segments unchanged', () => {
    expect(normalizePath('/api/v1/items')).toBe('/api/v1/items')
  })

  it('handles multiple dynamic segments', () => {
    expect(normalizePath('/projects/123/apis/456')).toBe('/projects/{id}/apis/{id}')
  })
})

describe('inferSchema', () => {
  it('infers string type', () => {
    expect(inferSchema('hello')).toEqual({ type: 'string' })
  })

  it('infers integer type for whole numbers', () => {
    expect(inferSchema(42)).toEqual({ type: 'integer' })
  })

  it('infers number type for floats', () => {
    expect(inferSchema(3.14)).toEqual({ type: 'number' })
  })

  it('infers boolean type', () => {
    expect(inferSchema(true)).toEqual({ type: 'boolean' })
  })

  it('infers null type', () => {
    expect(inferSchema(null)).toEqual({ type: 'null' })
  })

  it('infers array type with items from first element', () => {
    expect(inferSchema([1, 2, 3])).toEqual({
      type: 'array',
      items: { type: 'integer' },
    })
  })

  it('infers object type with properties', () => {
    expect(inferSchema({ id: 1, name: 'Alice' })).toEqual({
      type: 'object',
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
      },
    })
  })

  it('limits object properties to 20 keys', () => {
    const big: Record<string, number> = {}
    for (let i = 0; i < 25; i++) big[`key${i}`] = i
    const schema = inferSchema(big) as { type: string; properties: Record<string, unknown> }
    expect(Object.keys(schema.properties)).toHaveLength(20)
  })

  it('caps nesting at 4 levels deep', () => {
    const deep = { a: { b: { c: { d: { e: 'too deep' } } } } }
    const schema = inferSchema(deep, 0) as {
      type: string
      properties: {
        a: { type: string; properties: { b: { type: string; properties: { c: { type: string; properties: { d: unknown } } } } } }
      }
    }
    // At depth 4, d should be typed as object without going deeper
    expect(schema.properties.a.properties.b.properties.c.properties.d).toEqual({ type: 'object' })
  })
})

describe('parseHAR — static asset filtering', () => {
  it('excludes .css files', () => {
    const har = minimalHAR([makeEntry({ url: 'https://api.example.com/styles.css' })])
    const result = parseHAR(har)
    expect(result.entries).toHaveLength(0)
  })

  it('excludes .js files', () => {
    const har = minimalHAR([makeEntry({ url: 'https://api.example.com/app.js' })])
    const result = parseHAR(har)
    expect(result.entries).toHaveLength(0)
  })

  it('excludes image files', () => {
    const har = minimalHAR([makeEntry({ url: 'https://api.example.com/logo.png' })])
    const result = parseHAR(har)
    expect(result.entries).toHaveLength(0)
  })

  it('keeps JSON API entries', () => {
    const har = minimalHAR([makeEntry()])
    const result = parseHAR(har)
    expect(result.entries).toHaveLength(1)
  })
})

describe('parseHAR — JSON-only filter (default on)', () => {
  it('excludes non-JSON responses when jsonOnly is true', () => {
    const har = minimalHAR([makeEntry({ mimeType: 'text/html', responseBody: '<html/>' })])
    const result = parseHAR(har, { jsonOnly: true })
    expect(result.entries).toHaveLength(0)
  })

  it('includes non-JSON responses when jsonOnly is false', () => {
    const har = minimalHAR([makeEntry({ mimeType: 'text/html', responseBody: '<html/>' })])
    const result = parseHAR(har, { jsonOnly: false })
    expect(result.entries).toHaveLength(1)
  })
})

describe('parseHAR — deduplication (default on)', () => {
  it('keeps only first occurrence of same method + normalized endpoint', () => {
    const har = minimalHAR([
      makeEntry({ url: 'https://api.example.com/users/1' }),
      makeEntry({ url: 'https://api.example.com/users/2' }),
    ])
    const result = parseHAR(har, { deduplicate: true })
    expect(result.entries).toHaveLength(1)
  })

  it('keeps both when method differs', () => {
    const har = minimalHAR([
      makeEntry({ url: 'https://api.example.com/users', method: 'GET' }),
      makeEntry({ url: 'https://api.example.com/users', method: 'POST' }),
    ])
    const result = parseHAR(har, { deduplicate: true })
    expect(result.entries).toHaveLength(2)
  })

  it('keeps duplicates when deduplicate is false', () => {
    const har = minimalHAR([
      makeEntry({ url: 'https://api.example.com/users/1' }),
      makeEntry({ url: 'https://api.example.com/users/2' }),
    ])
    const result = parseHAR(har, { deduplicate: false })
    expect(result.entries).toHaveLength(2)
  })
})

describe('parseHAR — path normalization', () => {
  it('normalizes numeric IDs in the endpoint', () => {
    const har = minimalHAR([makeEntry({ url: 'https://api.example.com/orders/99' })])
    const result = parseHAR(har)
    expect(result.entries[0].endpoint).toBe('/orders/{id}')
  })

  it('strips query string from endpoint', () => {
    const har = minimalHAR([makeEntry({ url: 'https://api.example.com/items?page=1' })])
    const result = parseHAR(har)
    expect(result.entries[0].endpoint).toBe('/items')
  })
})

describe('parseHAR — schema inference', () => {
  it('infers response schema from JSON response body', () => {
    const har = minimalHAR([
      makeEntry({ responseBody: JSON.stringify({ id: 1, name: 'Alice' }) }),
    ])
    const result = parseHAR(har)
    expect(result.entries[0].response_schema).toEqual({
      type: 'object',
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
      },
    })
  })

  it('infers request schema from POST JSON body', () => {
    const har = minimalHAR([
      makeEntry({
        method: 'POST',
        url: 'https://api.example.com/users',
        requestBody: JSON.stringify({ name: 'Bob', age: 30 }),
      }),
    ])
    const result = parseHAR(har)
    expect(result.entries[0].request_schema).toEqual({
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'integer' },
      },
    })
  })

  it('infers request schema from query parameters when no body', () => {
    const har = minimalHAR([
      makeEntry({
        url: 'https://api.example.com/items',
        queryString: [
          { name: 'page', value: '1' },
          { name: 'limit', value: '20' },
        ],
      }),
    ])
    const result = parseHAR(har)
    expect(result.entries[0].request_schema).toEqual({
      type: 'object',
      properties: {
        page: { type: 'string', example: '1' },
        limit: { type: 'string', example: '20' },
      },
    })
  })
})

describe('parseHAR — metadata extraction', () => {
  it('notes Authorization header in special_notes', () => {
    const har = minimalHAR([
      makeEntry({
        headers: [{ name: 'Authorization', value: 'Bearer token123' }],
      }),
    ])
    const result = parseHAR(har)
    expect(result.entries[0].special_notes).toMatch(/bearer/i)
  })

  it('notes Cookie header in special_notes', () => {
    const har = minimalHAR([
      makeEntry({
        headers: [{ name: 'Cookie', value: 'session=abc' }],
      }),
    ])
    const result = parseHAR(har)
    expect(result.entries[0].special_notes).toMatch(/cookie auth/i)
  })

  it('stores host in special_notes', () => {
    const har = minimalHAR([makeEntry({ url: 'https://api.example.com/users' })])
    const result = parseHAR(har)
    expect(result.entries[0].special_notes).toMatch(/api\.example\.com/)
  })

  it('extracts response status', () => {
    const har = minimalHAR([makeEntry({ status: 201 })])
    const result = parseHAR(har)
    expect(result.entries[0].status_code).toBe(201)
  })
})

describe('parseHAR — multi-host', () => {
  it('surfaces all unique hosts in result', () => {
    const har = minimalHAR([
      makeEntry({ url: 'https://api.example.com/users' }),
      makeEntry({ url: 'https://cdn.example.com/data.json' }),
    ])
    const result = parseHAR(har, { jsonOnly: false })
    expect(result.hosts).toContain('api.example.com')
    expect(result.hosts).toContain('cdn.example.com')
  })
})

describe('parseHAR — error handling', () => {
  it('returns error for invalid JSON', () => {
    const result = parseHAR('not json')
    expect(result.error).toBeDefined()
    expect(result.entries).toHaveLength(0)
  })

  it('returns error when log.entries is missing', () => {
    const result = parseHAR(JSON.stringify({ log: {} }))
    expect(result.error).toBeDefined()
    expect(result.entries).toHaveLength(0)
  })
})
