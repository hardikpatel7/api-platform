'use server'

import { createClient } from '@/lib/supabase/server'

export async function withdrawSuggestionAction(
  suggestionId: string
): Promise<{ error: string } | undefined> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('suggestions')
    .update({
      status: 'rejected',
      review_note: 'Withdrawn by author',
    })
    .eq('id', suggestionId)

  if (error) return { error: error.message }
}
