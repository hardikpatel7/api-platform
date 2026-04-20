import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types'

interface UseRoleResult {
  role: UserRole | null
  loading: boolean
  noAdminExists: boolean
}

export function useRole(): UseRoleResult {
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [noAdminExists, setNoAdminExists] = useState(false)

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
        const fetchedRole = data.role as UserRole
        setRole(fetchedRole)
        if (fetchedRole !== 'admin') {
          const { count } = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'admin')
          setNoAdminExists((count ?? 0) === 0)
        }
      }
      setLoading(false)
    }
    fetchRole()
  }, [])

  return { role, loading, noAdminExists }
}
