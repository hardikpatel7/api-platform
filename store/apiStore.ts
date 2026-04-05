import { create } from 'zustand'
import type { ApiEntry } from '@/types'

interface ApiState {
  apis: ApiEntry[]
  loading: boolean
  error: string | null
  setApis: (apis: ApiEntry[]) => void
  addApi: (api: ApiEntry) => void
  updateApi: (id: string, updates: Partial<ApiEntry>) => void
  removeApi: (id: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useApiStore = create<ApiState>((set) => ({
  apis: [],
  loading: false,
  error: null,
  setApis: (apis) => set({ apis }),
  addApi: (api) => set((state) => ({ apis: [...state.apis, api] })),
  updateApi: (id, updates) =>
    set((state) => ({
      apis: state.apis.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),
  removeApi: (id) =>
    set((state) => ({ apis: state.apis.filter((a) => a.id !== id) })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}))
