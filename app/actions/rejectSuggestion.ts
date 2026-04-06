'use server'

import { createClient } from '@/lib/supabase/server'
import { logHistoryAction } from '@/lib/logHistory'
import type { Suggestion } from '@/types'

export async function rejectSuggestionAction(
  suggestionId: string,
  note: string,
): Promise<{ error: string } | undefined> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Fetch the suggestion to get context for history logging
  const { data: suggestion, error: fetchError } = await supabase
    .from('suggestions')
    .select('*')
    .eq('id', suggestionId)
    .single()
  if (fetchError || !suggestion) return { error: fetchError?.message ?? 'Suggestion not found' }
  const s = suggestion as Suggestion

  const { data: reviewer } = await supabase
    .from('users')
    .select('name')
    .eq('id', user.id)
    .single()

  const { error } = await supabase
    .from('suggestions')
    .update({
      status: 'rejected',
      review_note: note,
      reviewed_by: user.id,
      reviewer_name: reviewer?.name ?? '',
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', suggestionId)

  if (error) return { error: error.message }

  await logHistoryAction({
    action: 'suggestion_rejected',
    apiId: s.api_id ?? '',
    apiName: s.api_name,
    projectId: s.project_id,
    projectName: s.project_name,
    detail: `Rejected suggestion for: ${s.api_name}`,
  })
}
