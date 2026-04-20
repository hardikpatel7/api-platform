'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProjectStore } from '@/store/projectStore'
import { Sidebar } from '@/components/layout/Sidebar'
import { useRole } from '@/hooks/useRole'
import { canDo } from '@/lib/permissions'
import { EmptyState } from '@/components/ui/EmptyState'
import { FolderOpen, Plus, Trash2 } from 'lucide-react'
import { promoteToAdminIfNoAdmin } from '@/app/actions/adminRecovery'
import type { Project } from '@/types'

// ─── Skeleton card shown during loading ──────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="animate-pulse flex items-center justify-between p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
      <div className="space-y-2">
        <div className="h-3.5 w-40 bg-white/10 rounded" />
        <div className="h-2.5 w-64 bg-white/[0.06] rounded" />
      </div>
      <div className="h-5 w-12 bg-white/[0.06] rounded-full" />
    </div>
  )
}

// ─── Individual project card ──────────────────────────────────────────────────
interface ProjectCardProps {
  project: Project
  apiCount: number
  index: number
  canEdit: boolean
  onClick: () => void
  onDelete: (e: React.MouseEvent) => void
}

function ProjectCard({ project, apiCount, index, canEdit, onClick, onDelete }: ProjectCardProps) {
  return (
    <div
      className="group relative flex cursor-pointer items-center justify-between rounded-xl p-4 transition-all duration-200 animate-slide-up-fade [background:rgba(255,255,255,0.025)] hover:[background:rgba(255,255,255,0.04)] [border:1px_solid_rgba(255,255,255,0.07)] hover:[border:1px_solid_rgba(255,255,255,0.16)] [border-left:2px_solid_rgba(99,102,241,0.25)] hover:[border-left:2px_solid_rgba(99,102,241,0.7)] hover:[box-shadow:0_0_0_1px_rgba(255,255,255,0.05),0_4px_24px_rgba(0,0,0,0.4)]"
      style={{
        animationDelay: `${index * 60}ms`,
      }}
      onClick={onClick}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-100 truncate">
          {project.name}
        </p>
        {project.description && (
          <p className="mt-0.5 text-xs text-zinc-500 truncate max-w-md">
            {project.description}
          </p>
        )}
      </div>

      <div className="ml-4 flex shrink-0 items-center gap-3">
        {/* API count badge */}
        <span
          className="font-mono text-xs text-zinc-400 rounded-full px-2.5 py-0.5"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            letterSpacing: '0.02em',
          }}
        >
          {apiCount} {apiCount === 1 ? 'API' : 'APIs'}
        </span>

        {/* Delete — only visible on hover for editors/admins */}
        {canEdit && (
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex h-6 w-6 items-center justify-center rounded-md text-zinc-600 hover:text-red-400 hover:bg-red-400/10"
            style={{ border: '1px solid transparent' }}
            title="Delete project"
            aria-label="Delete project"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter()
  const { projects, setProjects, addProject, removeProject, loading, setLoading, apiCounts, setApiCounts } = useProjectStore()
  const { role, loading: roleLoading, noAdminExists } = useRole()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [pendingSuggestionCount, setPendingSuggestionCount] = useState(0)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('projects')
        .select('id, name, description, created_by, created_at')
        .order('created_at', { ascending: false })
      if (data) setProjects(data as Project[])

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
  }, [setLoading, setProjects, setApiCounts])

  useEffect(() => {
    if (!role) return
    async function loadPendingCount() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      let query = supabase.from('suggestions').select('id').eq('status', 'pending')
      if (role === 'suggester' && user?.id) {
        query = query.eq('user_id', user.id)
      }
      const { data: pending } = await query
      if (pending) setPendingSuggestionCount(pending.length)
    }
    loadPendingCount()
  }, [role])

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

  async function handleClaimAdmin() {
    const { promoted } = await promoteToAdminIfNoAdmin()
    if (promoted) {
      router.refresh()
    } else {
      alert('Could not claim admin access. A Supabase admin may already exist, or there was a connection error. Try reloading the page.')
    }
  }

  const isLoading = loading || roleLoading
  const canEdit = !!(role && canDo(role, 'direct_edit'))

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
        role={role}
        pendingSuggestionCount={pendingSuggestionCount}
        onOpenSuggestions={() => router.push('/suggestions')}
        onOpenUsers={() => router.push('/settings/users')}
      />

      <main className="flex-1 overflow-y-auto">
        {/* Grain texture overlay */}
        <div
          className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
            backgroundSize: '128px 128px',
          }}
        />

        <div className="relative z-10 max-w-2xl mx-auto px-6 py-10">
          {/* ── Page header ── */}
          <div className="flex items-start justify-between mb-10">
            <div>
              <h1
                className="text-2xl font-bold tracking-tight"
                style={{
                  background: 'linear-gradient(135deg, #f4f4f5 0%, #a1a1aa 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Projects
              </h1>
              <p
                className="mt-1 font-mono text-xs tracking-widest"
                style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}
              >
                {isLoading ? '···' : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
              </p>
            </div>

            {canEdit && (
              <button
                onClick={() => setShowCreate((v) => !v)}
                className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.85) 0%, rgba(79,70,229,0.85) 100%)',
                  boxShadow: showCreate
                    ? '0 0 0 2px rgba(99,102,241,0.4), 0 4px 16px rgba(99,102,241,0.25)'
                    : '0 1px 0 rgba(255,255,255,0.1) inset, 0 2px 12px rgba(99,102,241,0.2)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                New project
              </button>
            )}
          </div>

          {/* ── Create form panel ── */}
          <div
            className="overflow-hidden transition-all duration-300 ease-in-out"
            aria-hidden={!showCreate}
            style={{
              maxHeight: showCreate ? '220px' : '0px',
              opacity: showCreate ? 1 : 0,
            }}
          >
            <form
              onSubmit={handleCreate}
              className="mb-6 rounded-xl p-5 space-y-3"
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.09)',
                boxShadow: '0 4px 32px rgba(0,0,0,0.3)',
              }}
            >
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Project name"
                required
                autoFocus={showCreate}
                tabIndex={showCreate ? 0 : -1}
                className="w-full rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:ring-1"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  // ring on focus handled via style below
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)')}
              />
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Description (optional)"
                tabIndex={showCreate ? 0 : -1}
                className="w-full rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.09)',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)')}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-40 transition-opacity"
                  style={{
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.9) 0%, rgba(79,70,229,0.9) 100%)',
                    boxShadow: '0 1px 0 rgba(255,255,255,0.1) inset',
                  }}
                >
                  {creating ? 'Creating…' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>

          {/* ── Content area ── */}
          {isLoading ? (
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : projects.length === 0 ? (
            canEdit ? (
              <EmptyState
                icon={<FolderOpen className="w-5 h-5" />}
                title="No projects yet"
                description="Create your first project to start documenting APIs and sharing them with your team."
                actions={[{ label: '+ New project', variant: 'primary', onClick: () => setShowCreate(true) }]}
              />
            ) : (
              noAdminExists ? (
                <EmptyState
                  icon={<FolderOpen className="w-5 h-5" />}
                  title="No admin found"
                  description="It looks like no admin exists in the system. You can reclaim admin access below."
                  actions={[{
                    label: 'Claim admin access',
                    variant: 'primary',
                    onClick: handleClaimAdmin
                  }]}
                />
              ) : (
                <EmptyState
                  icon={<FolderOpen className="w-5 h-5" />}
                  title="No projects yet"
                  description="Ask your admin to create a project and you'll see it here."
                />
              )
            )
          ) : (
            <div className="space-y-2.5">
              {projects.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  apiCount={apiCounts[project.id] ?? 0}
                  index={index}
                  canEdit={canEdit}
                  onClick={() => router.push(`/projects/${project.id}`)}
                  onDelete={(e) => { e.stopPropagation(); handleDelete(project.id) }}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
