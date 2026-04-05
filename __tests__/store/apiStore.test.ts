import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useApiStore } from '@/store/apiStore'
import type { ApiEntry } from '@/types'

beforeEach(() => {
  useApiStore.setState({ apis: [], loading: false, error: null })
})

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

describe('apiStore', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useApiStore())
    expect(result.current.apis).toEqual([])
  })

  it('setApis replaces the list', () => {
    const { result } = renderHook(() => useApiStore())
    act(() => {
      result.current.setApis([makeEntry(), makeEntry({ id: 'api-2', name: 'Create Item' })])
    })
    expect(result.current.apis).toHaveLength(2)
  })

  it('addApi appends', () => {
    const { result } = renderHook(() => useApiStore())
    act(() => {
      result.current.addApi(makeEntry())
    })
    expect(result.current.apis).toHaveLength(1)
  })

  it('updateApi replaces by id', () => {
    const { result } = renderHook(() => useApiStore())
    act(() => {
      result.current.setApis([makeEntry()])
    })
    act(() => {
      result.current.updateApi('api-1', { name: 'Updated Name' })
    })
    expect(result.current.apis[0].name).toBe('Updated Name')
  })

  it('removeApi removes by id', () => {
    const { result } = renderHook(() => useApiStore())
    act(() => {
      result.current.setApis([makeEntry(), makeEntry({ id: 'api-2' })])
    })
    act(() => {
      result.current.removeApi('api-1')
    })
    expect(result.current.apis).toHaveLength(1)
    expect(result.current.apis[0].id).toBe('api-2')
  })
})
