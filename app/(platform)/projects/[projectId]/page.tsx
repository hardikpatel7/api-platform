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

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const router = useRouter()
  const { apis, setApis, loading, setLoading } = useApiStore()
  const { projects, setProjects } = useProjectStore()
  const { role } = useRole()
  const [project, setProject] = useState<Project | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [searchResultIds, setSearchResultIds] = useState<string[] | null>(null)
  const [showOpenAPI, setShowOpenAPI] = useState(false)
  const [showHAR, setShowHAR] = useState(false)

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
      if (data) setApis(data as ApiEntry[])

      const { data: projs } = await supabase
        .from('projects')
        .select('id, name, description, created_by, created_at')
        .order('created_at', { ascending: false })
      if (projs) setProjects(projs as Project[])

      setLoading(false)
    }
    load()
  }, [projectId])

  const searchFiltered = searchResultIds ? apis.filter((a) => searchResultIds.includes(a.id)) : apis
  const filtered = filterApis(searchFiltered, statusFilter, tagFilter)
  const grouped = groupApis(filtered)
  const showGroupHeaders = apis.some((a) => a.group)
  const allTags = [...new Set(apis.flatMap((a) => a.tags ?? []))]
  const subtitle = buildSubtitle(filtered.length, statusFilter, tagFilter)
  const apiCounts: Record<string, number> = { [projectId]: apis.length }

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
        onSearchResults={setSearchResultIds}
        searchResultIds={searchResultIds}
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
            <p className="text-sm text-muted-foreground">
              {apis.length === 0
                ? 'No APIs yet. Add one to get started.'
                : 'No APIs match the current filters.'}
            </p>
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
                      <ApiCard key={entry.id} entry={entry} projectId={projectId} />
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
