'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { User, UserRole } from '@/types'

const ROLES: UserRole[] = ['viewer', 'suggester', 'editor', 'admin']

const ROLE_COLORS: Record<UserRole, string> = {
  viewer:    'bg-gray-100 text-gray-700',
  suggester: 'bg-blue-100 text-blue-700',
  editor:    'bg-purple-100 text-purple-700',
  admin:     'bg-orange-100 text-orange-700',
}

interface UserManagementModalProps {
  users: User[]
  currentUserId: string
  onClose: () => void
  onChangeRole?: (userId: string, role: UserRole) => Promise<void>
  onDeleteUser?: (userId: string) => Promise<void>
  onAddUser?: (name: string, role: UserRole, email: string) => Promise<void>
}

export function UserManagementModal({
  users,
  currentUserId,
  onClose,
  onChangeRole,
  onDeleteUser,
  onAddUser,
}: UserManagementModalProps) {
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState<UserRole>('viewer')

  async function handleAdd() {
    if (!newName.trim()) return
    await onAddUser?.(newName.trim(), newRole, newEmail.trim())
    setNewName('')
    setNewEmail('')
    setNewRole('viewer')
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">User Management</h2>
          <button
            aria-label="Close"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* Add user form */}
        <div className="flex gap-2 pb-4 border-b">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New user name"
            className="flex-1 px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Email (optional)"
            className="flex-1 px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as UserRole)}
            className="text-xs border rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90"
          >
            Add user
          </button>
        </div>

        <div className="space-y-2">
          {users.map((user) => {
            const isCurrentUser = user.id === currentUserId
            return (
              <div key={user.id} className="flex items-center justify-between gap-3 py-2 border-b last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium truncate">{user.name}</span>
                  {isCurrentUser && (
                    <span className="text-xs text-muted-foreground shrink-0">(you)</span>
                  )}
                  <span className={cn('text-xs px-2 py-0.5 rounded-full shrink-0', ROLE_COLORS[user.role])}>
                    {user.role}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isCurrentUser && (
                    <>
                      <select
                        defaultValue={user.role}
                        onChange={(e) => onChangeRole?.(user.id, e.target.value as UserRole)}
                        className="text-xs border rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      <button
                        aria-label={`Delete ${user.name}`}
                        onClick={() => onDeleteUser?.(user.id)}
                        className="text-xs text-destructive border border-destructive rounded-md px-2 py-1 hover:bg-destructive/10"
                      >
                        Delete
                      </button>
                    </>
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
