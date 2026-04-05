import { describe, it, expect } from 'vitest'
import { diffApiEntries, type FieldDiff } from '@/lib/diff'
import type { ApiEntry } from '@/types'

const base: ApiEntry = {
  id: 'a1',
  project_id: 'p1',
  name: 'Get Users',
  endpoint: '/api/users',
  method: 'GET',
  created_by: 'u1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

describe('diffApiEntries — text fields', () => {
  it('returns empty array when nothing changed', () => {
    expect(diffApiEntries(base, base)).toEqual([])
  })

  it('detects a name change', () => {
    const next = { ...base, name: 'List Users' }
    const diffs = diffApiEntries(base, next)
    expect(diffs).toContainEqual<FieldDiff>({ field: 'name', original: 'Get Users', suggested: 'List Users' })
  })

  it('detects a method change', () => {
    const next = { ...base, method: 'POST' }
    const diffs = diffApiEntries(base, next)
    expect(diffs).toContainEqual<FieldDiff>({ field: 'method', original: 'GET', suggested: 'POST' })
  })

  it('detects an endpoint change', () => {
    const next = { ...base, endpoint: '/api/v2/users' }
    const diffs = diffApiEntries(base, next)
    expect(diffs).toContainEqual<FieldDiff>({ field: 'endpoint', original: '/api/users', suggested: '/api/v2/users' })
  })

  it('detects a version change', () => {
    const original = { ...base, version: 'v1' }
    const next = { ...original, version: 'v2' }
    const diffs = diffApiEntries(original, next)
    expect(diffs).toContainEqual<FieldDiff>({ field: 'version', original: 'v1', suggested: 'v2' })
  })

  it('detects a status change', () => {
    const original = { ...base, status: 'Stable' }
    const next = { ...original, status: 'Deprecated' }
    const diffs = diffApiEntries(original, next)
    expect(diffs).toContainEqual<FieldDiff>({ field: 'status', original: 'Stable', suggested: 'Deprecated' })
  })

  it('detects a group change', () => {
    const original = { ...base, group: 'Auth' }
    const next = { ...original, group: 'Users' }
    const diffs = diffApiEntries(original, next)
    expect(diffs).toContainEqual<FieldDiff>({ field: 'group', original: 'Auth', suggested: 'Users' })
  })

  it('detects a tool_description change', () => {
    const original = { ...base, tool_description: 'Old desc' }
    const next = { ...original, tool_description: 'New desc' }
    const diffs = diffApiEntries(original, next)
    expect(diffs).toContainEqual<FieldDiff>({ field: 'tool_description', original: 'Old desc', suggested: 'New desc' })
  })

  it('detects a special_notes change', () => {
    const original = { ...base, special_notes: 'Rate limited' }
    const next = { ...original, special_notes: 'No limits' }
    const diffs = diffApiEntries(original, next)
    expect(diffs).toContainEqual<FieldDiff>({ field: 'special_notes', original: 'Rate limited', suggested: 'No limits' })
  })

  it('only returns changed fields', () => {
    const next = { ...base, name: 'List Users' }
    const diffs = diffApiEntries(base, next)
    expect(diffs).toHaveLength(1)
    expect(diffs[0].field).toBe('name')
  })

  it('treats undefined and empty string as equivalent (no diff)', () => {
    const original = { ...base, version: undefined }
    const next = { ...base, version: '' }
    expect(diffApiEntries(original, next)).toEqual([])
  })
})
