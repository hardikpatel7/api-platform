'use server'

import { createClient } from '@/lib/supabase/server'
import { logHistoryAction } from '@/lib/logHistory'
import type { SuggestionType, HistoryAction } from '@/types'

interface SubmitSuggestionInput {
  type: SuggestionType
  projectId: string
  apiId: string | null
  payload: unknown
  original?: unknown
  apiName: string
  projectName: string
}

const SUGGESTION_ACTION: Record<SuggestionType, HistoryAction> = {
  edit:   'suggested_edit',
  create: 'suggested_create',
  delete: 'suggested_delete',
}

export async function submitSuggestionAction(
  input: SubmitSuggestionInput
): Promise<{ error: string } | undefined> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('suggestions').insert({
    type: input.type,
    project_id: input.projectId,
    api_id: input.apiId,
    user_id: user.id,
    payload: input.payload,
    original: input.original ?? null,
    status: 'pending',
  })

  if (error) return { error: error.message }

  await logHistoryAction({
    action: SUGGESTION_ACTION[input.type],
    apiId: input.apiId ?? '',
    apiName: input.apiName,
    projectId: input.projectId,
    projectName: input.projectName,
    detail: `${input.type.charAt(0).toUpperCase() + input.type.slice(1)} suggestion: ${input.apiName}`,
  })
}
