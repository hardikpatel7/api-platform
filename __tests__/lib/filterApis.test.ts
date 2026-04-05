import { describe, it, expect } from 'vitest'
import { filterApis, groupApis, buildSubtitle } from '@/lib/filterApis'
import type { ApiEntry } from '@/types'

const makeEntry = (overrides: Partial<ApiEntry> = {}): ApiEntry => ({
  id: 'api-1',
  project_id: 'p1',
  name: 'Get Items',
  endpoint: '/api/v1/items',
  method: 'GET',
  created_by: 'u1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

describe('filterApis', () => {
  it('returns all entries when no filters applied', () => {
    const entries = [makeEntry(), makeEntry({ id: 'api-2', name: 'Post Item' })]
    expect(filterApis(entries, null, null)).toHaveLength(2)
  })

  it('filters by status', () => {
    const entries = [
      makeEntry({ id: 'a1', status: 'Stable' }),
      makeEntry({ id: 'a2', status: 'Beta' }),
      makeEntry({ id: 'a3', status: 'Deprecated' }),
    ]
    const result = filterApis(entries, 'Stable', null)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a1')
  })

  it('filters by tag', () => {
    const entries = [
      makeEntry({ id: 'a1', tags: ['auth', 'read-only'] }),
      makeEntry({ id: 'a2', tags: ['write'] }),
      makeEntry({ id: 'a3', tags: [] }),
    ]
    const result = filterApis(entries, null, 'auth')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a1')
  })

  it('stacks status and tag filters (AND)', () => {
    const entries = [
      makeEntry({ id: 'a1', status: 'Stable', tags: ['auth'] }),
      makeEntry({ id: 'a2', status: 'Stable', tags: ['write'] }),
      makeEntry({ id: 'a3', status: 'Beta', tags: ['auth'] }),
    ]
    const result = filterApis(entries, 'Stable', 'auth')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a1')
  })
})

describe('groupApis', () => {
  it('returns a single null-key group when no entries have a group', () => {
    const entries = [makeEntry(), makeEntry({ id: 'a2' })]
    const groups = groupApis(entries)
    expect(groups.size).toBe(1)
    expect(groups.has(null)).toBe(true)
  })

  it('groups by the group field, sorted alphabetically', () => {
    const entries = [
      makeEntry({ id: 'a1', group: 'Inventory' }),
      makeEntry({ id: 'a2', group: 'Auth' }),
      makeEntry({ id: 'a3', group: 'Inventory' }),
    ]
    const groups = groupApis(entries)
    const keys = [...groups.keys()]
    expect(keys[0]).toBe('Auth')
    expect(keys[1]).toBe('Inventory')
  })

  it('places ungrouped entries last under null key', () => {
    const entries = [
      makeEntry({ id: 'a1', group: 'Auth' }),
      makeEntry({ id: 'a2', group: undefined }),
    ]
    const groups = groupApis(entries)
    const keys = [...groups.keys()]
    expect(keys[0]).toBe('Auth')
    expect(keys[1]).toBeNull()
  })

  it('omits the null group header when all entries have a group', () => {
    const entries = [
      makeEntry({ id: 'a1', group: 'Auth' }),
      makeEntry({ id: 'a2', group: 'Inventory' }),
    ]
    const groups = groupApis(entries)
    expect(groups.has(null)).toBe(false)
  })
})

describe('buildSubtitle', () => {
  it('shows total count with no filters', () => {
    expect(buildSubtitle(12, null, null)).toBe('12 endpoints')
  })

  it('includes tag when tag filter active', () => {
    expect(buildSubtitle(5, null, 'auth')).toBe('5 endpoints · #auth')
  })

  it('includes status when status filter active', () => {
    expect(buildSubtitle(3, 'Stable', null)).toBe('3 endpoints · Stable')
  })

  it('includes both tag and status when both active', () => {
    expect(buildSubtitle(2, 'Stable', 'auth')).toBe('2 endpoints · #auth · Stable')
  })

  it('uses singular "endpoint" for count of 1', () => {
    expect(buildSubtitle(1, null, null)).toBe('1 endpoint')
  })

  it('shows "N results across all projects" when isSearch is true', () => {
    expect(buildSubtitle(8, null, null, true)).toBe('8 results across all projects')
  })

  it('ignores filters when isSearch is true', () => {
    expect(buildSubtitle(3, 'Stable', 'auth', true)).toBe('3 results across all projects')
  })
})
