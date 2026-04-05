import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types'

interface UseRoleResult {
  role: UserRole | null
  loading: boolean
}

export function useRole(): UseRoleResult {
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRole() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      if (!error && data) {
        setRole(data.role as UserRole)
      }
      setLoading(false)
    }
    fetchRole()
  }, [])

  return { role, loading }
}
