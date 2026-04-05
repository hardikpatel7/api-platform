'use server'

import { createClient } from '@/lib/supabase/server'
import { logHistoryAction } from '@/lib/logHistory'

interface SuggestionContext {
  apiId: string
  apiName: string
  projectId: string
  projectName: string
}

export async function rejectSuggestionAction(
  suggestionId: string,
  note: string,
  context?: SuggestionContext
): Promise<{ error: string } | undefined> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

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

  if (context) {
    await logHistoryAction({
      action: 'suggestion_rejected',
      apiId: context.apiId,
      apiName: context.apiName,
      projectId: context.projectId,
      projectName: context.projectName,
      detail: `Rejected suggestion for: ${context.apiName}`,
    })
  }
}
