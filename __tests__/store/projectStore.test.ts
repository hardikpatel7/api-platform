import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useProjectStore } from '@/store/projectStore'
import type { Project } from '@/types'

// Reset store between tests
beforeEach(() => {
  useProjectStore.setState({ projects: [], loading: false, error: null, apiCounts: {} })
})

const mockProjects: Project[] = [
  { id: 'p1', name: 'Alpha', created_by: 'u1', created_at: '2024-01-01T00:00:00Z' },
  { id: 'p2', name: 'Beta', created_by: 'u1', created_at: '2024-01-02T00:00:00Z' },
]

describe('projectStore', () => {
  it('starts with empty projects list', () => {
    const { result } = renderHook(() => useProjectStore())
    expect(result.current.projects).toEqual([])
  })

  it('setProjects replaces the list', () => {
    const { result } = renderHook(() => useProjectStore())
    act(() => {
      result.current.setProjects(mockProjects)
    })
    expect(result.current.projects).toHaveLength(2)
    expect(result.current.projects[0].name).toBe('Alpha')
  })

  it('addProject appends to the list', () => {
    const { result } = renderHook(() => useProjectStore())
    act(() => {
      result.current.setProjects(mockProjects)
    })
    const newProject: Project = {
      id: 'p3',
      name: 'Gamma',
      created_by: 'u1',
      created_at: '2024-01-03T00:00:00Z',
    }
    act(() => {
      result.current.addProject(newProject)
    })
    expect(result.current.projects).toHaveLength(3)
    expect(result.current.projects[2].name).toBe('Gamma')
  })

  it('removeProject removes by id', () => {
    const { result } = renderHook(() => useProjectStore())
    act(() => {
      result.current.setProjects(mockProjects)
    })
    act(() => {
      result.current.removeProject('p1')
    })
    expect(result.current.projects).toHaveLength(1)
    expect(result.current.projects[0].id).toBe('p2')
  })

  it('setLoading sets the loading flag', () => {
    const { result } = renderHook(() => useProjectStore())
    act(() => {
      result.current.setLoading(true)
    })
    expect(result.current.loading).toBe(true)
  })

  it('setError stores an error message', () => {
    const { result } = renderHook(() => useProjectStore())
    act(() => {
      result.current.setError('Failed to load')
    })
    expect(result.current.error).toBe('Failed to load')
  })

  it('setApiCounts replaces the entire apiCounts map', () => {
    const { result } = renderHook(() => useProjectStore())
    act(() => {
      result.current.setApiCounts({ p1: 5, p2: 3 })
    })
    expect(result.current.apiCounts).toEqual({ p1: 5, p2: 3 })
  })

  it('setApiCounts overwrites a previously set map', () => {
    const { result } = renderHook(() => useProjectStore())
    act(() => {
      result.current.setApiCounts({ p1: 5, p2: 3 })
    })
    act(() => {
      result.current.setApiCounts({ p3: 7 })
    })
    expect(result.current.apiCounts).toEqual({ p3: 7 })
  })

  it('mergeApiCount adds a single project count without losing others', () => {
    const { result } = renderHook(() => useProjectStore())
    act(() => {
      result.current.setApiCounts({ p1: 5, p2: 3 })
    })
    act(() => {
      result.current.mergeApiCount('p3', 10)
    })
    expect(result.current.apiCounts).toEqual({ p1: 5, p2: 3, p3: 10 })
  })

  it('mergeApiCount updates an existing project count', () => {
    const { result } = renderHook(() => useProjectStore())
    act(() => {
      result.current.setApiCounts({ p1: 5 })
    })
    act(() => {
      result.current.mergeApiCount('p1', 8)
    })
    expect(result.current.apiCounts).toEqual({ p1: 8 })
  })
})
