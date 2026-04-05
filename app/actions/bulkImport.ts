'use server'

import { createClient } from '@/lib/supabase/server'
import { logHistoryAction } from '@/lib/logHistory'

interface BulkImportInput {
  projectId: string
  projectName: string
  entries: Record<string, unknown>[]
}

export async function bulkImportAction(
  input: BulkImportInput
): Promise<{ error: string } | undefined> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const rows = input.entries.map((entry) => ({
    ...entry,
    project_id: input.projectId,
    created_by: user.id,
  }))

  const { error } = await supabase.from('api_entries').insert(rows)
  if (error) return { error: error.message }

  await logHistoryAction({
    action: 'bulk_import',
    apiId: '',
    apiName: '',
    projectId: input.projectId,
    projectName: input.projectName,
    detail: `Bulk imported ${input.entries.length} API${input.entries.length !== 1 ? 's' : ''}`,
  })
}
