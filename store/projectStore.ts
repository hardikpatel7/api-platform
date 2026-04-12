import { create } from 'zustand'
import type { Project } from '@/types'

interface ProjectState {
  projects: Project[]
  loading: boolean
  error: string | null
  apiCounts: Record<string, number>
  setProjects: (projects: Project[]) => void
  addProject: (project: Project) => void
  removeProject: (id: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setApiCounts: (counts: Record<string, number>) => void
  mergeApiCount: (projectId: string, count: number) => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  loading: false,
  error: null,
  apiCounts: {},
  setProjects: (projects) => set({ projects }),
  addProject: (project) =>
    set((state) => ({ projects: [...state.projects, project] })),
  removeProject: (id) =>
    set((state) => ({ projects: state.projects.filter((p) => p.id !== id) })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setApiCounts: (counts) => set({ apiCounts: counts }),
  mergeApiCount: (projectId, count) =>
    set((state) => ({
      apiCounts: { ...state.apiCounts, [projectId]: count },
    })),
}))
