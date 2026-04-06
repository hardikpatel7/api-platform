'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRole } from '@/hooks/useRole'
import { canDo } from '@/lib/permissions'
import { UserManagementModal } from '@/components/settings/UserManagementModal'
import type { User, UserRole } from '@/types'

export default function SettingsUsersPage() {
  const router = useRouter()
  const { role, loading } = useRole()
  const [users, setUsers] = useState<User[]>([])
  const [currentUserId, setCurrentUserId] = useState<string>('')

  useEffect(() => {
    if (!loading && role && !canDo(role, 'manage_users')) {
      router.push('/')
      return
    }
    if (!loading && role) {
      async function load() {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) setCurrentUserId(user.id)

        const { data } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: true })
        if (data) setUsers(data as User[])
      }
      load()
    }
  }, [role, loading])

  async function handleChangeRole(userId: string, newRole: UserRole) {
    const supabase = createClient()
    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId)
    if (!error) {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u))
    }
  }

  async function handleDeleteUser(userId: string) {
    const supabase = createClient()
    const { error } = await supabase.from('users').delete().eq('id', userId)
    if (!error) {
      setUsers((prev) => prev.filter((u) => u.id !== userId))
    }
  }

  async function handleAddUser(name: string, userRole: UserRole, email: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('users')
      .insert({ name, role: userRole, ...(email ? { email } : {}) })
      .select()
      .single()
    if (!error && data) {
      setUsers((prev) => [...prev, data as User])
    }
  }

  if (loading || !role) return null

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <UserManagementModal
          users={users}
          currentUserId={currentUserId}
          onClose={() => router.push('/')}
          onChangeRole={handleChangeRole}
          onDeleteUser={handleDeleteUser}
          onAddUser={handleAddUser}
        />
      </div>
    </main>
  )
}
