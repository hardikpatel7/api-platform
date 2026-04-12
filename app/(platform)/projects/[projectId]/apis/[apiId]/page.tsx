'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useApiStore } from '@/store/apiStore'
import { ApiForm } from '@/components/api/ApiForm'
import { ApiDetailTabs } from '@/components/api/ApiDetailTabs'
import { ApiDetailActions } from '@/components/api/ApiDetailActions'
import { generateApiDocsAction } from '@/app/actions/generate'
import { submitSuggestionAction } from '@/app/actions/submitSuggestion'
import { useRole } from '@/hooks/useRole'
import { canDo } from '@/lib/permissions'
import { useProjectStore } from '@/store/projectStore'
import type { ApiEntry, HistoryEntry } from '@/types'

export default function ApiDetailPage() {
  const { projectId, apiId } = useParams<{ projectId: string; apiId: string }>()
  const router = useRouter()
  const { apis, updateApi, removeApi } = useApiStore()
  const { projects } = useProjectStore()
  const { role } = useRole()
  const projectName = projects.find((p) => p.id === projectId)?.name ?? ''
  const [entry, setEntry] = useState<ApiEntry | null>(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [historyEvents, setHistoryEvents] = useState<HistoryEntry[]>([])

  useEffect(() => {
    const fromStore = apis.find((a) => a.id === apiId)
    if (fromStore) {
      setEntry(fromStore)
      setLoading(false)
    } else {
      async function loadEntry() {
        const supabase = createClient()
        const { data } = await supabase
          .from('api_entries')
          .select('*')
          .eq('id', apiId)
          .single()
        if (data) setEntry(data as ApiEntry)
        setLoading(false)
      }
      loadEntry()
    }

    async function loadHistory() {
      const supabase = createClient()
      const { data } = await supabase
        .from('history_events')
        .select('*')
        .eq('api_id', apiId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (data) setHistoryEvents(data as HistoryEntry[])
    }
    loadHistory()
  }, [apiId, apis])

  async function handleSave(data: Partial<ApiEntry>) {
    const supabase = createClient()
    const { data: updated, error } = await supabase
      .from('api_entries')
      .update(data)
      .eq('id', apiId)
      .select()
      .single()

    if (!error && updated) {
      updateApi(apiId, updated)
      setEntry(updated as ApiEntry)
      setEditing(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this API entry?')) return
    const supabase = createClient()
    await supabase.from('api_entries').delete().eq('id', apiId)
    removeApi(apiId)
    router.push(`/projects/${projectId}`)
  }

  async function handleSuggestDelete() {
    if (!entry || !confirm('Suggest deletion of this API entry?')) return
    await submitSuggestionAction({
      type: 'delete',
      projectId: entry.project_id,
      apiId: entry.id,
      payload: null,
      original: entry,
      apiName: entry.name,
      projectName,
    })
    router.push(`/projects/${projectId}`)
  }

  async function handleSuggestEdit(data: Partial<ApiEntry>) {
    if (!entry) return
    await submitSuggestionAction({
      type: 'edit',
      projectId: entry.project_id,
      apiId: entry.id,
      payload: data,
      original: entry,
      apiName: entry.name,
      projectName,
    })
    setEditing(false)
  }

  async function handleGenerateFromDetail() {
    if (!entry) return
    const result = await generateApiDocsAction({
      name: entry.name,
      method: entry.method,
      endpoint: entry.endpoint,
      requestSchema: entry.request_schema ?? undefined,
      responseSchema: entry.response_schema ?? undefined,
    })
    await handleSave({
      tool_description: result.tool_description,
      mcp_config: result.mcp_config,
    })
  }

  if (loading) {
    return <main className="flex-1 p-6"><p className="text-sm text-muted-foreground">Loading…</p></main>
  }
  if (!entry) {
    return <main className="flex-1 p-6"><p className="text-sm text-muted-foreground">API not found.</p></main>
  }

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/projects/${projectId}`)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back
            </button>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              {entry.name}
              {editing && role && !canDo(role, 'direct_edit') && (
                <span
                  data-testid="suggestion-badge"
                  className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700"
                >
                  Suggestion
                </span>
              )}
            </h1>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <button
                onClick={() => setEditing(false)}
                className="px-3 py-1.5 border rounded-md text-sm hover:bg-accent"
              >
                Cancel
              </button>
            ) : role ? (
              <ApiDetailActions
                role={role}
                onEdit={() => setEditing(true)}
                onDelete={handleDelete}
                onSuggestEdit={() => setEditing(true)}
                onSuggestDelete={handleSuggestDelete}
              />
            ) : null}
          </div>
        </div>

        {editing ? (
          <ApiForm
            initialData={entry}
            onSubmit={role && canDo(role, 'direct_edit') ? handleSave : handleSuggestEdit}
            submitLabel={role && canDo(role, 'direct_edit') ? 'Save changes' : 'Submit Suggestion'}
            onGenerate={role && canDo(role, 'use_ai') ? generateApiDocsAction : undefined}
          />
        ) : (
          <ApiDetailTabs
            entry={entry}
            historyEvents={historyEvents}
            role={role ?? undefined}
            onEdit={() => setEditing(true)}
            onGenerate={role && canDo(role, 'use_ai') ? handleGenerateFromDetail : undefined}
          />
        )}
      </div>
    </main>
  )
}
