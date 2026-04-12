'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useApiStore } from '@/store/apiStore'
import { useProjectStore } from '@/store/projectStore'
import { Sidebar } from '@/components/layout/Sidebar'
import { ApiCard } from '@/components/api/ApiCard'
import { filterApis, groupApis, buildSubtitle } from '@/lib/filterApis'
import { semanticSearchAction } from '@/app/actions/search'
import { OpenAPIImportModal } from '@/components/import/OpenAPIImportModal'
import { HARImportModal } from '@/components/import/HARImportModal'
import { ProjectActionBar } from '@/components/api/ProjectActionBar'
import { useRole } from '@/hooks/useRole'
import { bulkImportAction } from '@/app/actions/bulkImport'
import type { ApiEntry, Project } from '@/types'
import { EmptyState } from '@/components/ui/EmptyState'
import { Plug } from 'lucide-react'
import { canDo } from '@/lib/permissions'

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const router = useRouter()
  const { apis, setApis, loading, setLoading } = useApiStore()
  const { projects, setProjects, apiCounts, mergeApiCount } = useProjectStore()
  const { role } = useRole()
  const [project, setProject] = useState<Project | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [searchResultIds, setSearchResultIds] = useState<string[] | null>(null)
  const [searchEntries, setSearchEntries] = useState<ApiEntry[]>([])
  const [searchProjectNames, setSearchProjectNames] = useState<Record<string, string>>({})
  const [showOpenAPI, setShowOpenAPI] = useState(false)
  const [showHAR, setShowHAR] = useState(false)
  const [pendingSuggestionCount, setPendingSuggestionCount] = useState(0)
  const [pendingApiIds, setPendingApiIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      setLoading(true)
      const supabase = createClient()

      const { data: proj } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()
      if (proj) setProject(proj as Project)

      const { data } = await supabase
        .from('api_entries')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
      if (data) {
        setApis(data as ApiEntry[])
        mergeApiCount(projectId, data.length)
      }

      const { data: projs } = await supabase
        .from('projects')
        .select('id, name, description, created_by, created_at')
        .order('created_at', { ascending: false })
      if (projs) setProjects(projs as Project[])

      // Load pending suggestions — api_id badges always based on all pending
      const { data: pendingAll } = await supabase
        .from('suggestions')
        .select('id, api_id')
        .eq('status', 'pending')
      if (pendingAll) {
        setPendingApiIds(new Set(pendingAll.map((s: { api_id: string | null }) => s.api_id).filter(Boolean) as string[]))
      }

      setLoading(false)
    }
    load()
  }, [projectId])

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

  async function handleSearchResults(ids: string[] | null) {
    setSearchResultIds(ids)
    if (!ids) {
      setSearchEntries([])
      setSearchProjectNames({})
      return
    }
    const supabase = createClient()
    const { data } = await supabase
      .from('api_entries')
      .select('*')
      .in('id', ids)
    if (data) {
      setSearchEntries(data as ApiEntry[])
      // Build project name map from the already-loaded projects list
      const nameMap: Record<string, string> = {}
      for (const entry of data as ApiEntry[]) {
        const proj = projects.find((p) => p.id === entry.project_id)
        if (proj) nameMap[entry.project_id] = proj.name
      }
      setSearchProjectNames(nameMap)
    }
  }

  const isSearch = searchResultIds !== null
  const displayEntries = isSearch ? searchEntries : apis
  const filtered = isSearch ? displayEntries : filterApis(displayEntries, statusFilter, tagFilter)
  const grouped = groupApis(filtered)
  const showGroupHeaders = !isSearch && apis.some((a) => a.group)
  const allTags = [...new Set(apis.flatMap((a) => a.tags ?? []))]
  const subtitle = buildSubtitle(filtered.length, statusFilter, tagFilter, isSearch)
  return (
    <div className="flex flex-1 overflow-hidden">
      <Sidebar
        projects={projects}
        apiCounts={apiCounts}
        activeProjectId={projectId}
        statusFilter={statusFilter}
        tagFilter={tagFilter}
        availableTags={allTags}
        onStatusFilter={setStatusFilter}
        onTagFilter={setTagFilter}
        onSearch={semanticSearchAction}
        onSearchResults={handleSearchResults}
        searchResultIds={searchResultIds}
        role={role}
        pendingSuggestionCount={pendingSuggestionCount}
        onOpenSuggestions={() => router.push('/suggestions')}
        onOpenUsers={() => router.push('/settings/users')}
      />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-semibold">{project?.name ?? 'Project'}</h1>
            {role && (
              <ProjectActionBar
                role={role}
                onAddApi={() => router.push(`/projects/${projectId}/apis/new`)}
                onImportHAR={() => setShowHAR(true)}
                onImportOpenAPI={() => setShowOpenAPI(true)}
                onSuggestNewApi={() => router.push(`/projects/${projectId}/apis/new`)}
              />
            )}
          </div>

          <p className="text-sm text-muted-foreground mb-6">{subtitle}</p>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            isSearch ? (
              <p className="text-sm text-muted-foreground">No APIs match your search.</p>
            ) : apis.length === 0 ? (
              role && canDo(role, 'direct_edit') ? (
                <EmptyState
                  icon={<Plug className="w-5 h-5" />}
                  title="No APIs yet"
                  description="Add your first API entry manually, or import from an OpenAPI spec or HAR file."
                  actions={[
                    { label: '+ Add API', variant: 'primary', onClick: () => router.push(`/projects/${projectId}/apis/new`) },
                    { label: 'Import OpenAPI', variant: 'secondary', onClick: () => setShowOpenAPI(true) },
                    { label: 'Import HAR', variant: 'secondary', onClick: () => setShowHAR(true) },
                  ]}
                />
              ) : role === 'suggester' ? (
                <EmptyState
                  icon={<Plug className="w-5 h-5" />}
                  title="No APIs yet"
                  description="This project has no APIs. You can suggest a new one for editors to review."
                  actions={[{ label: 'Suggest new API', variant: 'primary', onClick: () => router.push(`/projects/${projectId}/apis/new`) }]}
                />
              ) : (
                <EmptyState
                  icon={<Plug className="w-5 h-5" />}
                  title="No APIs yet"
                  description="This project has no APIs documented yet."
                />
              )
            ) : (
              <p className="text-sm text-muted-foreground">No APIs match the current filters.</p>
            )
          ) : (
            <div className="space-y-6">
              {[...grouped.entries()].map(([groupName, entries]) => (
                <div key={groupName ?? '__ungrouped'}>
                  {showGroupHeaders && groupName && (
                    <div className="flex items-center gap-2 mb-3">
                      <h2 className="text-sm font-semibold">{groupName}</h2>
                      <span className="text-xs text-muted-foreground">{entries.length}</span>
                    </div>
                  )}
                  <div className="space-y-2">
                    {entries.map((entry) => (
                      <ApiCard
                        key={entry.id}
                        entry={entry}
                        projectId={entry.project_id}
                        projectName={isSearch ? searchProjectNames[entry.project_id] : undefined}
                        hasPendingSuggestion={!isSearch && pendingApiIds.has(entry.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showOpenAPI && (
        <OpenAPIImportModal
          projectId={projectId}
          projectName={project?.name}
          onClose={() => setShowOpenAPI(false)}
          onImport={(entries) => bulkImportAction({ projectId, projectName: project?.name ?? '', entries })}
        />
      )}
      {showHAR && (
        <HARImportModal
          projectId={projectId}
          projectName={project?.name}
          onClose={() => setShowHAR(false)}
          onImport={(entries) => bulkImportAction({ projectId, projectName: project?.name ?? '', entries })}
        />
      )}
    </div>
  )
}
