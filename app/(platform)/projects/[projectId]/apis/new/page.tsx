'use client'

import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useApiStore } from '@/store/apiStore'
import { useProjectStore } from '@/store/projectStore'
import { ApiForm } from '@/components/api/ApiForm'
import { generateApiDocsAction } from '@/app/actions/generate'
import { submitSuggestionAction } from '@/app/actions/submitSuggestion'
import { useRole } from '@/hooks/useRole'
import { canDo } from '@/lib/permissions'
import type { ApiEntry } from '@/types'

export default function NewApiPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const router = useRouter()
  const { addApi } = useApiStore()
  const { projects } = useProjectStore()
  const { role } = useRole()
  const projectName = projects.find((p) => p.id === projectId)?.name ?? ''
  const isSuggester = !!(role && !canDo(role, 'direct_edit') && canDo(role, 'suggest'))

  async function handleSubmit(data: Partial<ApiEntry>) {
    if (isSuggester) {
      await submitSuggestionAction({
        type: 'create',
        projectId,
        apiId: null,
        payload: data,
        apiName: (data.name as string) ?? '',
        projectName,
      })
      router.push(`/projects/${projectId}`)
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: created, error } = await supabase
      .from('api_entries')
      .insert({ ...data, project_id: projectId, created_by: user.id })
      .select()
      .single()

    if (!error && created) {
      addApi(created as ApiEntry)
      router.push(`/projects/${projectId}`)
    }
  }

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back
          </button>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            New API
            {isSuggester && (
              <span
                data-testid="suggestion-badge"
                className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700"
              >
                Suggestion
              </span>
            )}
          </h1>
        </div>
        <ApiForm
          onSubmit={handleSubmit}
          submitLabel={isSuggester ? 'Submit Suggestion' : 'Create API'}
          onGenerate={!isSuggester ? generateApiDocsAction : undefined}
        />
      </div>
    </main>
  )
}
