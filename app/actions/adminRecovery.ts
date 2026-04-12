'use server'

import { createClient } from '@/lib/supabase/server'

export async function promoteToAdminIfNoAdmin(): Promise<{ promoted: boolean }> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('promote_if_no_admin')
  if (error) {
    console.error('[adminRecovery] promote_if_no_admin failed:', error)
    return { promoted: false }
  }
  return { promoted: data === true }
}
