'use client'

import { useState } from 'react'
import { UserPlus, Trash2, Shield, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { User, UserRole } from '@/types'

const ROLES: UserRole[] = ['viewer', 'suggester', 'editor', 'admin']

const ROLE_COLORS: Record<UserRole, string> = {
  viewer:    'bg-white/[0.06] text-zinc-300 border border-white/[0.08]',
  suggester: 'bg-blue-500/15 text-blue-300 border border-blue-500/20',
  editor:    'bg-violet-500/15 text-violet-300 border border-violet-500/20',
  admin:     'bg-amber-500/15 text-amber-300 border border-amber-500/20',
}

const ROLE_ICONS: Partial<Record<UserRole, React.ReactNode>> = {
  viewer: <Eye className="w-3 h-3" />,
  admin:  <Shield className="w-3 h-3" />,
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

interface UserManagementModalProps {
  users: User[]
  currentUserId: string
  onClose?: () => void
  onChangeRole?: (userId: string, role: UserRole) => Promise<void>
  onDeleteUser?: (userId: string) => Promise<void>
  onAddUser?: (name: string, role: UserRole, email: string) => Promise<void>
}

export function UserManagementModal({
  users,
  currentUserId,
  onChangeRole,
  onDeleteUser,
  onAddUser,
}: UserManagementModalProps) {
  const [newName, setNewName]   = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole]   = useState<UserRole>('viewer')
  const [isAdding, setIsAdding] = useState(false)
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null)

  async function handleAdd() {
    if (!newName.trim()) return
    setIsAdding(true)
    try {
      await onAddUser?.(newName.trim(), newRole, newEmail.trim())
      setNewName('')
      setNewEmail('')
      setNewRole('viewer')
    } finally {
      setIsAdding(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleAdd()
  }

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">User Management</h2>
      </div>

      {/* Add user card */}
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5 space-y-3">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Add a user</p>

        {/* Row 1: Name + Email */}
        <div className="flex gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Full name"
            className="flex-1 bg-white/[0.04] border border-white/[0.09] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-white/[0.2] transition-colors placeholder:text-white/30"
          />
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Email (optional)"
            className="flex-1 bg-white/[0.04] border border-white/[0.09] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-white/[0.2] transition-colors placeholder:text-white/30"
          />
        </div>

        {/* Row 2: Role select + Add button */}
        <div className="flex items-center gap-3">
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as UserRole)}
            className="bg-white/[0.04] border border-white/[0.09] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-white/[0.2] transition-colors"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={isAdding}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            {isAdding ? 'Adding…' : 'Add user'}
          </button>
        </div>
      </div>

      {/* User list card */}
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.08]">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">
            {users.length} {users.length === 1 ? 'member' : 'members'}
          </p>
        </div>

        <div className="divide-y divide-white/[0.06]">
          {users.map((user) => {
            const isCurrentUser = user.id === currentUserId
            return (
              <div
                key={user.id}
                className="grid grid-cols-[44px_1fr_110px_auto] items-center gap-3 px-5 py-3"
              >
                {/* Col 1: Avatar */}
                <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-xs font-medium text-white/60 select-none">
                  {getInitials(user.name)}
                </div>

                {/* Col 2: Name + (you) */}
                <div className="min-w-0 flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{user.name}</span>
                  {isCurrentUser && (
                    <span className="text-xs text-white/40 shrink-0">(you)</span>
                  )}
                </div>

                {/* Col 3: Role badge — always visible */}
                <div className="flex justify-start">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full whitespace-nowrap',
                      ROLE_COLORS[user.role],
                    )}
                  >
                    {ROLE_ICONS[user.role]}
                    {user.role}
                  </span>
                </div>

                {/* Col 4: Actions (non-current users only) */}
                <div className="flex items-center gap-2">
                  {!isCurrentUser ? (
                    <>
                      <select
                        value={user.role}
                        onChange={async (e) => {
                          setLoadingUserId(user.id)
                          await onChangeRole?.(user.id, e.target.value as UserRole)
                          setLoadingUserId(null)
                        }}
                        disabled={loadingUserId === user.id}
                        aria-label={`Change role for ${user.name}`}
                        className="bg-white/[0.04] border border-white/[0.09] text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-white/[0.2] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      <button
                        aria-label={`Delete ${user.name}`}
                        onClick={() => onDeleteUser?.(user.id)}
                        disabled={loadingUserId === user.id}
                        className="text-xs text-red-400 hover:text-red-300 disabled:text-red-400/50 disabled:cursor-not-allowed border border-red-500/20 hover:border-red-400/40 disabled:border-red-500/10 rounded-md px-2 py-1 transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </>
                  ) : (
                    /* Placeholder to keep grid consistent */
                    <span />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
