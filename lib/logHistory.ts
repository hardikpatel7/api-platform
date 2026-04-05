import { createClient } from '@/lib/supabase/server'
import type { HistoryAction } from '@/types'

interface LogHistoryInput {
  action: HistoryAction
  apiId: string
  apiName: string
  projectId: string
  projectName: string
  detail: string
}

export async function logHistoryAction(input: LogHistoryInput): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single()

  await supabase.from('history_events').insert({
    action: input.action,
    api_id: input.apiId,
    api_name: input.apiName,
    project_id: input.projectId,
    project_name: input.projectName,
    detail: input.detail,
    user_id: user.id,
    user_name: profile?.name ?? 'Unknown',
    user_role: profile?.role ?? 'viewer',
  })
}
