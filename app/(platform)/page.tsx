'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProjectStore } from '@/store/projectStore'
import { Sidebar } from '@/components/layout/Sidebar'
import type { Project } from '@/types'

export default function HomePage() {
  const router = useRouter()
  const { projects, setProjects, addProject, removeProject, loading, setLoading } = useProjectStore()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [apiCounts, setApiCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    async function load() {
      setLoading(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('projects')
        .select('id, name, description, created_by, created_at')
        .order('created_at', { ascending: false })
      if (data) setProjects(data as Project[])

      // Load API counts
      const { data: counts } = await supabase
        .from('api_entries')
        .select('project_id')
      if (counts) {
        const map: Record<string, number> = {}
        for (const row of counts) {
          map[row.project_id] = (map[row.project_id] ?? 0) + 1
        }
        setApiCounts(map)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('projects')
      .insert({ name: newName.trim(), description: newDesc.trim() || null, created_by: user.id })
      .select()
      .single()

    if (!error && data) {
      addProject(data as Project)
      setShowCreate(false)
      setNewName('')
      setNewDesc('')
    }
    setCreating(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this project and all its APIs?')) return
    const supabase = createClient()
    await supabase.from('projects').delete().eq('id', id)
    removeProject(id)
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <Sidebar
        projects={projects}
        apiCounts={apiCounts}
        activeProjectId={null}
        statusFilter={null}
        tagFilter={null}
        availableTags={[]}
        onStatusFilter={() => {}}
        onTagFilter={() => {}}
      />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-semibold">Projects</h1>
            <button
              onClick={() => setShowCreate(true)}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90"
            >
              New project
            </button>
          </div>

          {showCreate && (
            <form onSubmit={handleCreate} className="mb-6 p-4 border rounded-lg space-y-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Project name"
                required
                autoFocus
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Description (optional)"
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {creating ? 'Creating…' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-3 py-1.5 border rounded-md text-sm hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects yet. Create one to get started.</p>
          ) : (
            <div className="space-y-2">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:border-primary/50 cursor-pointer"
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                  <div>
                    <p className="font-medium text-sm">{project.name}</p>
                    {project.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{project.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {apiCounts[project.id] ?? 0} APIs
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(project.id) }}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
