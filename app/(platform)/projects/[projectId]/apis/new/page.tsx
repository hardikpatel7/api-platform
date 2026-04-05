'use client'

import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useApiStore } from '@/store/apiStore'
import { ApiForm } from '@/components/api/ApiForm'
import { generateApiDocsAction } from '@/app/actions/generate'
import type { ApiEntry } from '@/types'

export default function NewApiPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const router = useRouter()
  const { addApi } = useApiStore()

  async function handleSubmit(data: Partial<ApiEntry>) {
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
          <h1 className="text-xl font-semibold">New API</h1>
        </div>
        <ApiForm onSubmit={handleSubmit} submitLabel="Create API" onGenerate={generateApiDocsAction} />
      </div>
    </main>
  )
}
