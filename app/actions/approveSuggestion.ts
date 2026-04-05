'use server'

import { createClient } from '@/lib/supabase/server'
import { logHistoryAction } from '@/lib/logHistory'
import type { Suggestion } from '@/types'

export async function approveSuggestionAction(
  suggestionId: string
): Promise<{ error: string } | undefined> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Fetch the suggestion to read its type and payload
  const { data: suggestion, error: fetchError } = await supabase
    .from('suggestions')
    .select('*')
    .eq('id', suggestionId)
    .single()

  if (fetchError || !suggestion) return { error: fetchError?.message ?? 'Suggestion not found' }

  const s = suggestion as Suggestion

  // Apply the mutation to api_entries based on suggestion type
  if (s.type === 'edit' && s.api_id) {
    const { error } = await supabase
      .from('api_entries')
      .update(s.payload as Record<string, unknown>)
      .eq('id', s.api_id)
    if (error) return { error: error.message }
  } else if (s.type === 'create') {
    const { error } = await supabase
      .from('api_entries')
      .insert(s.payload as Record<string, unknown>)
    if (error) return { error: error.message }
  } else if (s.type === 'delete' && s.api_id) {
    const { error } = await supabase
      .from('api_entries')
      .delete()
      .eq('id', s.api_id)
    if (error) return { error: error.message }
  }

  // Mark the suggestion as approved
  const { data: reviewer } = await supabase
    .from('users')
    .select('name')
    .eq('id', user.id)
    .single()

  const { error } = await supabase
    .from('suggestions')
    .update({
      status: 'approved',
      reviewed_by: user.id,
      reviewer_name: reviewer?.name ?? '',
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', suggestionId)

  if (error) return { error: error.message }

  await logHistoryAction({
    action: 'suggestion_approved',
    apiId: s.api_id ?? undefined,
    apiName: s.api_name,
    projectId: s.project_id,
    projectName: s.project_name,
    detail: `Approved suggestion for: ${s.api_name}`,
  })
}
