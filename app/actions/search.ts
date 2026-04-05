'use server'

import { createClient } from '@/lib/supabase/server'
import { semanticSearch, type ApiIndexEntry } from '@/lib/ai/search'

export async function semanticSearchAction(query: string): Promise<{
  ids: string[]
  error?: string
}> {
  try {
    const supabase = createClient()

    // Build the search index across all projects the user can access
    const { data: apis, error } = await supabase
      .from('api_entries')
      .select(`
        id, name, method, endpoint, tool_description, tags, group,
        projects ( name )
      `)

    if (error) return { ids: [], error: error.message }

    const index: ApiIndexEntry[] = (apis ?? []).map((a) => ({
      id: a.id as string,
      name: a.name as string,
      method: a.method as string,
      endpoint: a.endpoint as string,
      tool_description: a.tool_description as string | undefined,
      tags: a.tags as string[] | undefined,
      group: a.group as string | undefined,
      projectName: (a.projects as { name: string } | null)?.name ?? '',
    }))

    const ids = await semanticSearch(query, index)
    return { ids }
  } catch (e) {
    return { ids: [], error: (e as Error).message }
  }
}
